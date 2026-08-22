from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from django.db.models import Prefetch

from menu.models import PackagingType, Product, ProductOption

from .models import (
    DailyOrderCounter,
    DeliveryCustomer,
    Order,
    OrderItem,
    OrderPackagingItem,
    normalize_customer_name,
)


def replace_packaging_items(order, packaging_items):
    order.packaging_items.all().delete()
    if order.order_type == Order.OrderType.EAT_IN:
        return Decimal("0.00")

    requested_ids = {item["packaging_type_id"] for item in packaging_items}
    packaging_types = {
        item.id: item
        for item in PackagingType.objects.filter(id__in=requested_ids, is_active=True)
    }
    if len(packaging_types) != len(requested_ids):
        raise ValidationError("Uno de los envases no existe o no está disponible.")

    total = Decimal("0.00")
    for item in packaging_items:
        quantity = item["quantity"]
        if quantity < 1 or quantity > 99:
            raise ValidationError("La cantidad de envases no es válida.")
        packaging_type = packaging_types[item["packaging_type_id"]]
        subtotal = packaging_type.price * quantity
        OrderPackagingItem.objects.create(
            order=order,
            packaging_type=packaging_type,
            name_snapshot=packaging_type.name,
            unit_price=packaging_type.price,
            quantity=quantity,
            subtotal=subtotal,
        )
        total += subtotal
    return total


def load_configurable_products(product_ids):
    available_options = ProductOption.objects.filter(is_available=True).order_by(
        "sort_order", "id"
    )
    return {
        product.id: product
        for product in Product.objects.filter(
            id__in=product_ids,
            is_available=True,
        ).prefetch_related(
            Prefetch(
                "option_groups__options",
                queryset=available_options,
                to_attr="available_options",
            )
        )
    }


def prepare_configured_item(product, quantity, selected_option_ids=None):
    if quantity < 1:
        raise ValidationError("La cantidad debe ser mayor que cero.")

    explicit_selection = selected_option_ids is not None
    try:
        requested_ids = {int(option_id) for option_id in (selected_option_ids or [])}
    except (TypeError, ValueError):
        raise ValidationError("Una opción del producto no es válida.")

    known_ids = set()
    default_ids = set()
    selected_ids = set()
    snapshot = []
    adjustment_total = Decimal("0.00")

    for group in product.option_groups.all():
        options = list(group.available_options)
        group_option_ids = {option.id for option in options}
        known_ids.update(group_option_ids)
        group_defaults = {option.id for option in options if option.is_default}
        default_ids.update(group_defaults)
        group_selected_ids = (
            requested_ids.intersection(group_option_ids)
            if explicit_selection
            else group_defaults
        )

        if group.selection_type == group.SelectionType.SINGLE and len(group_selected_ids) > 1:
            raise ValidationError(f"Selecciona solamente una opción en {group.name}.")
        if group.is_required and not group_selected_ids:
            raise ValidationError(f"Selecciona una opción en {group.name}.")

        selected_options = [
            option for option in options if option.id in group_selected_ids
        ]
        selected_ids.update(group_selected_ids)
        if selected_options:
            snapshot.append(
                {
                    "group": group.name,
                    "options": [
                        {
                            "name": option.name,
                            "price_adjustment": str(option.price_adjustment),
                        }
                        for option in selected_options
                    ],
                }
            )
            adjustment_total += sum(
                (option.price_adjustment for option in selected_options),
                Decimal("0.00"),
            )

    if requested_ids - known_ids:
        raise ValidationError("Una opción seleccionada no pertenece al producto.")

    unit_price = product.price + adjustment_total
    if unit_price < 0:
        raise ValidationError("La configuración produce un precio inválido.")

    return {
        "product": product,
        "quantity": quantity,
        "base_unit_price": product.price,
        "unit_price": unit_price,
        "configuration_snapshot": snapshot,
        "configuration_signature": ",".join(map(str, sorted(selected_ids))),
        "is_customized": selected_ids != default_ids,
    }


def save_delivery_customer(order):
    if (
        order.order_type not in {Order.OrderType.DELIVERY, Order.OrderType.PICKUP}
        or not order.customer_name.strip()
    ):
        return

    clean_name = " ".join(order.customer_name.split())
    defaults = {
        "name": clean_name,
        "phone": order.phone,
    }
    if order.order_type == Order.OrderType.DELIVERY:
        defaults.update(
            {
                "street": order.street,
                "exterior_number": order.exterior_number,
                "interior_number": order.interior_number,
                "neighborhood": order.neighborhood,
                "notes": order.notes,
            }
        )
    DeliveryCustomer.objects.update_or_create(
        normalized_name=normalize_customer_name(clean_name),
        defaults=defaults,
    )


@transaction.atomic
def create_order(*, user, order_type, items, customer_data=None, packaging_items=None):
    if not items:
        raise ValidationError("El pedido debe contener productos.")

    if order_type not in Order.OrderType.values:
        raise ValidationError("El tipo de pedido no es válido.")

    customer_data = customer_data or {}
    allowed_fields = {
        "customer_name",
        "phone",
        "table_reference",
        "street",
        "exterior_number",
        "interior_number",
        "neighborhood",
        "notes",
    }

    clean_customer_data = {
        key: value
        for key, value in customer_data.items()
        if key in allowed_fields
    }

    today = timezone.localdate()

    counter, _ = DailyOrderCounter.objects.select_for_update().get_or_create(
        operating_date=today,
    )
    counter.last_number += 1
    counter.save(update_fields=["last_number"])

    employee_name = user.username

    order = Order.objects.create(
        daily_number=counter.last_number,
        operating_date=today,
        created_by=user,
        employee_name_snapshot=employee_name,
        order_type=order_type,
        **clean_customer_data,
    )

    products = load_configurable_products({item["product_id"] for item in items})
    if len(products) != len({item["product_id"] for item in items}):
        raise ValidationError("Uno de los productos no existe o no está disponible.")

    configured_items = {}
    for item in items:
        configured = prepare_configured_item(
            products[item["product_id"]],
            item["quantity"],
            item.get("option_ids"),
        )
        key = (configured["product"].id, configured["configuration_signature"])
        if key in configured_items:
            configured_items[key]["quantity"] += configured["quantity"]
        else:
            configured_items[key] = configured

    total = Decimal("0.00")
    for configured in configured_items.values():
        product = configured["product"]
        subtotal = configured["unit_price"] * configured["quantity"]

        OrderItem.objects.create(
            order=order,
            product=product,
            product_name_snapshot=product.name,
            base_unit_price=configured["base_unit_price"],
            unit_price=configured["unit_price"],
            quantity=configured["quantity"],
            subtotal=subtotal,
            configuration_snapshot=configured["configuration_snapshot"],
            configuration_signature=configured["configuration_signature"],
            is_customized=configured["is_customized"],
        )

        total += subtotal

    order.packaging_fee = replace_packaging_items(order, packaging_items or [])
    order.total = total + order.packaging_fee
    order.save(update_fields=["packaging_fee", "total"])
    save_delivery_customer(order)

    return order


@transaction.atomic
def update_order(
    *,
    order,
    order_type,
    item_quantities,
    new_items,
    customer_data=None,
):
    if order_type not in Order.OrderType.values:
        raise ValidationError("El tipo de pedido no es válido.")

    order = Order.objects.select_for_update().get(pk=order.pk)
    current_items = {
        item.id: item
        for item in OrderItem.objects.select_for_update().filter(order=order)
    }

    normalized_quantities = {}
    for item_id, quantity in item_quantities.items():
        if item_id not in current_items:
            raise ValidationError("Uno de los productos ya no pertenece al pedido.")
        if quantity < 0:
            raise ValidationError("Las cantidades no pueden ser negativas.")
        normalized_quantities[item_id] = quantity

    new_product_quantities = {}
    for item in new_items:
        quantity = item["quantity"]
        if quantity < 1:
            raise ValidationError("La cantidad debe ser mayor que cero.")
        product_id = item["product_id"]
        new_product_quantities[product_id] = (
            new_product_quantities.get(product_id, 0) + quantity
        )

    remaining_items = sum(
        1
        for item_id in current_items
        if normalized_quantities.get(item_id, current_items[item_id].quantity) > 0
    )
    if remaining_items == 0 and not new_product_quantities:
        raise ValidationError("El pedido debe contener al menos un producto.")

    existing_product_ids = {
        item.product_id
        for item in current_items.values()
        if item.product_id is not None
    }
    if existing_product_ids.intersection(new_product_quantities):
        raise ValidationError("Un producto ya existe dentro del pedido.")

    products = {
        product.id: product
        for product in Product.objects.filter(
            id__in=new_product_quantities,
            is_available=True,
        )
    }
    if len(products) != len(new_product_quantities):
        raise ValidationError(
            "Uno de los productos nuevos no existe o no está disponible."
        )

    for item_id, item in current_items.items():
        quantity = normalized_quantities.get(item_id, item.quantity)
        if quantity == 0:
            item.delete()
            continue

        item.quantity = quantity
        item.subtotal = item.unit_price * quantity
        item.save(update_fields=["quantity", "subtotal"])

    for product_id, quantity in new_product_quantities.items():
        product = products[product_id]
        OrderItem.objects.create(
            order=order,
            product=product,
            product_name_snapshot=product.name,
            unit_price=product.price,
            quantity=quantity,
            subtotal=product.price * quantity,
        )

    customer_data = customer_data or {}
    customer_fields = (
        "customer_name",
        "phone",
        "table_reference",
        "street",
        "exterior_number",
        "interior_number",
        "neighborhood",
        "notes",
    )
    for field in customer_fields:
        setattr(order, field, customer_data.get(field, ""))

    if order_type == Order.OrderType.EAT_IN:
        order.phone = ""
        order.street = ""
        order.exterior_number = ""
        order.interior_number = ""
        order.neighborhood = ""
    elif order_type == Order.OrderType.PICKUP:
        order.table_reference = ""
        order.street = ""
        order.exterior_number = ""
        order.interior_number = ""
        order.neighborhood = ""
    else:
        order.table_reference = ""

    order.order_type = order_type
    order.total = sum(
        order.items.values_list("subtotal", flat=True),
        order.packaging_fee,
    )
    order.save(
        update_fields=[
            "order_type",
            *customer_fields,
            "total",
            "updated_at",
        ]
    )
    return order


@transaction.atomic
def update_order_information(*, order, cleaned_data):
    order = Order.objects.select_for_update().get(pk=order.pk)
    employee = cleaned_data["created_by"]
    order.created_by = employee
    order.employee_name_snapshot = employee.username
    order.order_type = cleaned_data["order_type"]
    order.status = cleaned_data["status"]

    customer_fields = (
        "customer_name",
        "phone",
        "table_reference",
        "street",
        "exterior_number",
        "interior_number",
        "neighborhood",
        "notes",
    )
    for field in customer_fields:
        setattr(order, field, cleaned_data.get(field, ""))

    if order.order_type == Order.OrderType.EAT_IN:
        order.phone = ""
        order.street = ""
        order.exterior_number = ""
        order.interior_number = ""
        order.neighborhood = ""
    elif order.order_type == Order.OrderType.PICKUP:
        order.table_reference = ""
        order.street = ""
        order.exterior_number = ""
        order.interior_number = ""
        order.neighborhood = ""
    else:
        order.table_reference = ""

    order.total = sum(
        order.items.values_list("subtotal", flat=True),
        order.packaging_fee,
    )
    order.save(
        update_fields=[
            "created_by",
            "employee_name_snapshot",
            "order_type",
            "status",
            "packaging_fee",
            "total",
            *customer_fields,
            "updated_at",
        ]
    )
    save_delivery_customer(order)
    return order


@transaction.atomic
def update_order_products(*, order, item_quantities, new_items, packaging_items=None):
    order = Order.objects.select_for_update().get(pk=order.pk)
    current_items = {
        item.id: item
        for item in OrderItem.objects.select_for_update().filter(order=order)
    }

    for item_id, quantity in item_quantities.items():
        if item_id not in current_items or quantity < 0:
            raise ValidationError("Una cantidad del pedido no es válida.")

    requested_product_ids = {item["product_id"] for item in new_items}
    products = load_configurable_products(requested_product_ids)
    if len(products) != len(requested_product_ids):
        raise ValidationError("Uno de los productos ya no está disponible.")

    prepared_additions = {}
    for new_item in new_items:
        configured = prepare_configured_item(
            products[new_item["product_id"]],
            new_item["quantity"],
            new_item.get("option_ids"),
        )
        key = (
            configured["product"].id,
            configured["configuration_signature"],
        )
        if key in prepared_additions:
            prepared_additions[key]["quantity"] += configured["quantity"]
        else:
            prepared_additions[key] = configured

    current_by_configuration = {}
    for item in current_items.values():
        key = (item.product_id, item.configuration_signature)
        current_by_configuration.setdefault(key, item)

    new_configurations = []
    for key, configured in prepared_additions.items():
        existing_item = current_by_configuration.get(key)
        if existing_item:
            item_quantities[existing_item.id] = (
                item_quantities.get(existing_item.id, existing_item.quantity)
                + configured["quantity"]
            )
        else:
            new_configurations.append(configured)

    remaining_count = sum(
        1
        for item_id, item in current_items.items()
        if item_quantities.get(item_id, item.quantity) > 0
    )
    if remaining_count == 0 and not new_configurations:
        raise ValidationError("El pedido debe contener al menos un producto.")

    for item_id, item in current_items.items():
        quantity = item_quantities.get(item_id, item.quantity)
        if quantity == 0:
            item.delete()
        else:
            item.quantity = quantity
            item.subtotal = item.unit_price * quantity
            item.save(update_fields=["quantity", "subtotal"])

    for configured in new_configurations:
        product = configured["product"]
        quantity = configured["quantity"]
        OrderItem.objects.create(
            order=order,
            product=product,
            product_name_snapshot=product.name,
            base_unit_price=configured["base_unit_price"],
            unit_price=configured["unit_price"],
            quantity=quantity,
            subtotal=configured["unit_price"] * quantity,
            configuration_snapshot=configured["configuration_snapshot"],
            configuration_signature=configured["configuration_signature"],
            is_customized=configured["is_customized"],
        )

    order.packaging_fee = replace_packaging_items(order, packaging_items or [])
    order.total = sum(
        order.items.values_list("subtotal", flat=True),
        order.packaging_fee,
    )
    order.save(update_fields=["packaging_fee", "total", "updated_at"])
    return order


@transaction.atomic
def update_complete_order(*, order, cleaned_data, item_quantities, new_items, packaging_items=None):
    """Update information and products as one indivisible operation."""
    update_order_products(
        order=order,
        item_quantities=item_quantities,
        new_items=new_items,
        packaging_items=packaging_items,
    )
    return update_order_information(order=order, cleaned_data=cleaned_data)
