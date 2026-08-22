from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("menu", "0002_productoptiongroup_productoption")]

    operations = [
        migrations.CreateModel(
            name="BusinessSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("singleton_key", models.BooleanField(default=True, editable=False, unique=True)),
                ("automatic_packaging_fee", models.BooleanField(default=True)),
                ("packaging_fee", models.DecimalField(decimal_places=2, default=Decimal("10.00"), max_digits=10)),
            ],
            options={"verbose_name": "Configuración del negocio", "verbose_name_plural": "Configuración del negocio"},
        ),
    ]
