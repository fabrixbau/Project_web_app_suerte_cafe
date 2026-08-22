from decimal import Decimal

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


def create_initial_packaging(apps, schema_editor):
    BusinessSettings = apps.get_model("menu", "BusinessSettings")
    PackagingType = apps.get_model("menu", "PackagingType")
    Product = apps.get_model("menu", "Product")
    settings_object = BusinessSettings.objects.first()
    price = settings_object.packaging_fee if settings_object else Decimal("10.00")
    packaging = PackagingType.objects.create(name="Envase general", price=price)
    Product.objects.update(packaging_type=packaging)


class Migration(migrations.Migration):
    dependencies = [("menu", "0003_businesssettings")]

    operations = [
        migrations.CreateModel(
            name="PackagingType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("price", models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal("0.00"))])),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order", "name"]},
        ),
        migrations.AddField(
            model_name="product",
            name="packaging_type",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="products", to="menu.packagingtype"),
        ),
        migrations.RunPython(create_initial_packaging, migrations.RunPython.noop),
        migrations.RemoveField(model_name="businesssettings", name="packaging_fee"),
    ]
