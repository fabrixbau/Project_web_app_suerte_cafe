from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    image = models.ImageField(
        upload_to="categories/",
        blank=True,
    )

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class PackagingType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    name = models.CharField(max_length=150)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
    )
    image = models.ImageField(
        upload_to="products/",
        blank=True,
    )
    description = models.TextField(blank=True)
    is_available = models.BooleanField(default=True)
    packaging_type = models.ForeignKey(
        PackagingType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ProductOptionGroup(models.Model):
    class SelectionType(models.TextChoices):
        SINGLE = "single", "Elegir una opción"
        MULTIPLE = "multiple", "Elegir varias opciones"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="option_groups",
    )
    name = models.CharField(max_length=100)
    selection_type = models.CharField(
        max_length=20,
        choices=SelectionType.choices,
        default=SelectionType.SINGLE,
    )
    is_required = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "name"],
                name="unique_product_option_group_name",
            )
        ]

    def __str__(self):
        return f"{self.product.name} · {self.name}"

    @property
    def has_valid_default(self):
        defaults = sum(1 for option in self.options.all() if option.is_available and option.is_default)
        if self.selection_type == self.SelectionType.SINGLE and defaults > 1:
            return False
        return not self.is_required or defaults >= 1


class BusinessSettings(models.Model):
    singleton_key = models.BooleanField(default=True, unique=True, editable=False)
    automatic_packaging_fee = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Configuración del negocio"
        verbose_name_plural = "Configuración del negocio"

    @classmethod
    def load(cls):
        settings_object, _ = cls.objects.get_or_create(singleton_key=True)
        return settings_object

    def __str__(self):
        return "Configuración de Suerte Café"


class ProductOption(models.Model):
    group = models.ForeignKey(
        ProductOptionGroup,
        on_delete=models.CASCADE,
        related_name="options",
    )
    name = models.CharField(max_length=100)
    price_adjustment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    is_default = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "name"],
                name="unique_product_option_name",
            )
        ]

    def __str__(self):
        return f"{self.group.name} · {self.name}"
