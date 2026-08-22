from decimal import Decimal

from django.db import migrations, models


def copy_existing_prices(apps, schema_editor):
    OrderItem = apps.get_model("orders", "OrderItem")
    for item in OrderItem.objects.all().iterator():
        item.base_unit_price = item.unit_price or Decimal("0.00")
        item.save(update_fields=["base_unit_price"])


class Migration(migrations.Migration):
    dependencies = [
        ("menu", "0002_productoptiongroup_productoption"),
        ("orders", "0003_deliverycustomer"),
    ]

    operations = [
        migrations.AddField(model_name="orderitem", name="base_unit_price", field=models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=10)),
        migrations.AddField(model_name="orderitem", name="configuration_snapshot", field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name="orderitem", name="configuration_signature", field=models.CharField(blank=True, max_length=500)),
        migrations.AddField(model_name="orderitem", name="is_customized", field=models.BooleanField(default=False)),
        migrations.RunPython(copy_existing_prices, migrations.RunPython.noop),
    ]
