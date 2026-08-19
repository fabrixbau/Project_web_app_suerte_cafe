from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from menu.models import Product

from .models import DailyOrderCounter, Order, OrderItem


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

    profile = getattr(user, "profile", None)
    employee_name = (
        getattr(profile, "display_name", "")
        or user.get_full_name()
        or user.username
    )

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

    return order