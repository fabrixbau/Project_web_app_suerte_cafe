from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from menu.models import Product

class DailyOrderCounter(models.Model):
    operating_date = models.DateField(primary_key=True)
    last_number = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.operating_date}: {self.last_number}"


class Order(models.Model):
    class OrderType(models.TextChoices):
        EAT_IN = "eat_in", "Comer aquí"
        DELIVERY = "delivery", "Entrega"
        PICKUP = "pickup", "Recoger"

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "En proceso"
        COMPLETED = "completed", "Completado"
        CANCELED = "canceled", "Cancelado"

    daily_number = models.PositiveIntegerField(editable=False)
    operating_date = models.DateField(default=timezone.localdate)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="orders",
    )
    employee_name_snapshot = models.CharField(
        max_length=150,
        blank=True,
    )

    order_type = models.CharField(
        max_length=20,
        choices=OrderType.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.IN_PROGRESS,
    )

    customer_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    table_reference = models.CharField(max_length=100, blank=True)

    street = models.CharField(max_length=150, blank=True)
    exterior_number = models.CharField(max_length=20, blank=True)
    interior_number = models.CharField(max_length=20, blank=True)
    neighborhood = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)

    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["operating_date", "daily_number"],
                name="unique_daily_order_number",
            )
        ]

    def __str__(self):
        return f"#{self.daily_number:03d} - {self.operating_date}"

    @property
    def formatted_number(self):
        return f"#{self.daily_number:03d}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        related_name="order_items",
    )

    product_name_snapshot = models.CharField(max_length=150)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    def __str__(self):
        return f"{self.product_name_snapshot} × {self.quantity}"
