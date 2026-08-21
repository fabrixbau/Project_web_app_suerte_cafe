from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from menu.models import Product

from .models import (
    DailyOrderCounter,
    DeliveryCustomer,
    Order,
    OrderItem,
    normalize_customer_name,
)


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
def create_order(*, user, order_type, items, customer_data=None):
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

    total = Decimal("0.00")

    for item in items:
        quantity = item["quantity"]

        if quantity < 1:
            raise ValidationError("La cantidad debe ser mayor que cero.")

        try:
            product = Product.objects.get(
                id=item["product_id"],
                is_available=True,
            )
        except Product.DoesNotExist:
            raise ValidationError(
                "Uno de los productos no existe o no está disponible."
            )

        subtotal = product.price * quantity

        OrderItem.objects.create(
            order=order,
            product=product,
            product_name_snapshot=product.name,
            unit_price=product.price,
            quantity=quantity,
            subtotal=subtotal,
        )

        total += subtotal

    order.total = total
    order.save(update_fields=["total"])
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
        Decimal("0.00"),
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

    order.save(
        update_fields=[
            "created_by",
            "employee_name_snapshot",
            "order_type",
            "status",
            *customer_fields,
            "updated_at",
        ]
    )
    save_delivery_customer(order)
    return order


@transaction.atomic
def update_order_products(*, order, item_quantities, new_items):
    order = Order.objects.select_for_update().get(pk=order.pk)
    current_items = {
        item.id: item
        for item in OrderItem.objects.select_for_update().filter(order=order)
    }

    for item_id, quantity in item_quantities.items():
        if item_id not in current_items or quantity < 0:
            raise ValidationError("Una cantidad del pedido no es válida.")

    remaining_count = sum(
        1
        for item_id, item in current_items.items()
        if item_quantities.get(item_id, item.quantity) > 0
    )
    if remaining_count == 0 and not new_items:
        raise ValidationError("El pedido debe contener al menos un producto.")

    requested_product_ids = {item["product_id"] for item in new_items}

    products = {
        product.id: product
        for product in Product.objects.filter(
            id__in=requested_product_ids,
            is_available=True,
        )
    }
    if len(products) != len(requested_product_ids):
        raise ValidationError("Uno de los productos ya no está disponible.")

    additional_quantities = {
        item["product_id"]: item["quantity"] for item in new_items
    }

    for item_id, item in current_items.items():
        quantity = item_quantities.get(item_id, item.quantity)
        if item.product_id in additional_quantities:
            quantity += additional_quantities.pop(item.product_id)
        if quantity == 0:
            item.delete()
        else:
            item.quantity = quantity
            item.subtotal = item.unit_price * quantity
            item.save(update_fields=["quantity", "subtotal"])

    for product_id, quantity in additional_quantities.items():
        if quantity < 1:
            continue
        product = products[product_id]
        OrderItem.objects.create(
            order=order,
            product=product,
            product_name_snapshot=product.name,
            unit_price=product.price,
            quantity=quantity,
            subtotal=product.price * quantity,
        )

    order.total = sum(
        order.items.values_list("subtotal", flat=True),
        Decimal("0.00"),
    )
    order.save(update_fields=["total", "updated_at"])
    return order


@transaction.atomic
def update_complete_order(*, order, cleaned_data, item_quantities, new_items):
    """Update information and products as one indivisible operation."""
    update_order_products(
        order=order,
        item_quantities=item_quantities,
        new_items=new_items,
    )
    return update_order_information(order=order, cleaned_data=cleaned_data)
