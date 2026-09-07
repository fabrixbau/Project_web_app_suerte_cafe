from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from menu.models import Category, PackagingType, Product


def normalize_customer_name(value):
    return " ".join((value or "").split()).casefold()


class DeliveryCustomer(models.Model):
    name = models.CharField(max_length=150)
    normalized_name = models.CharField(max_length=150, unique=True, editable=False)
    phone = models.CharField(max_length=30, blank=True)
    street = models.CharField(max_length=150, blank=True)
    exterior_number = models.CharField(max_length=20, blank=True)
    interior_number = models.CharField(max_length=20, blank=True)
    neighborhood = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        self.name = " ".join(self.name.split())
        self.normalized_name = normalize_customer_name(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class DailyReconciliation(models.Model):
    operating_date = models.DateField(unique=True, default=timezone.localdate)
    opening_cash = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    closing_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0.00"))])
    closing_card = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0.00"))])
    closing_transfer = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0.00"))])
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reconciliations_updated")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-operating_date"]

    @property
    def is_closed(self):
        return all(value is not None for value in (self.closing_cash, self.closing_card, self.closing_transfer))

    def __str__(self):
        return f"Conciliación {self.operating_date}"


class Expense(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Efectivo"
        CARD = "card", "Terminal"
        TRANSFER = "transfer", "Transferencia"

    operating_date = models.DateField(default=timezone.localdate)
    concept = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="expenses_created")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.concept}: ${self.amount}"

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

    class BarStatus(models.TextChoices):
        PENDING = "pending", "Pendiente"
        COMPLETED = "completed", "Terminada"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Efectivo"
        CARD = "card", "Tarjeta"
        TRANSFER = "transfer", "Transferencia"

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
    cold_bar_status = models.CharField(
        max_length=20,
        choices=BarStatus.choices,
        default=BarStatus.PENDING,
    )
    hot_bar_status = models.CharField(
        max_length=20,
        choices=BarStatus.choices,
        default=BarStatus.PENDING,
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
    packaging_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    cash_received = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tip_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

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


    @property
    def charged_total(self):
        return self.total + self.tip_amount

    @property
    def change_due(self):
        if self.payment_method != self.PaymentMethod.CASH or self.cash_received is None:
            return Decimal("0.00")
        return max(self.cash_received - self.charged_total, Decimal("0.00"))

    def update_overall_status(self):
        """Completa la orden cuando todas las barras que sí tienen productos terminaron."""
        if self.status == self.Status.CANCELED:
            return
        stations = set(self.items.values_list("preparation_station_snapshot", flat=True))
        required_statuses = []
        if Category.PreparationStation.COLD in stations:
            required_statuses.append(self.cold_bar_status)
        if Category.PreparationStation.HOT in stations:
            required_statuses.append(self.hot_bar_status)
        self.status = (
            self.Status.COMPLETED
            if required_statuses and all(status == self.BarStatus.COMPLETED for status in required_statuses)
            else self.Status.IN_PROGRESS
        )
        self.save(update_fields=["status", "updated_at"])

class OrderPackagingItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="packaging_items")
    packaging_type = models.ForeignKey(
        PackagingType,
        on_delete=models.SET_NULL,
        null=True,
        related_name="order_packaging_items",
    )
    name_snapshot = models.CharField(max_length=100)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name_snapshot} × {self.quantity}"


class OrderItem(models.Model):
    class PreparationStatus(models.TextChoices):
        PENDING = "pending", "Pendiente"
        COMPLETED = "completed", "Terminada"

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
    preparation_station_snapshot = models.CharField(
        max_length=10,
        choices=Category.PreparationStation.choices,
        default=Category.PreparationStation.HOT,
    )
    preparation_status = models.CharField(
        max_length=12,
        choices=PreparationStatus.choices,
        default=PreparationStatus.PENDING,
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    base_unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    configuration_snapshot = models.JSONField(default=list, blank=True)
    configuration_signature = models.CharField(max_length=500, blank=True)
    is_customized = models.BooleanField(default=False)
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    def __str__(self):
        return f"{self.product_name_snapshot} × {self.quantity}"
