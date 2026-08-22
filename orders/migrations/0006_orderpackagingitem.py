from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


def preserve_existing_fees(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    OrderPackagingItem = apps.get_model("orders", "OrderPackagingItem")
    for order in Order.objects.filter(packaging_fee__gt=0).iterator():
        OrderPackagingItem.objects.create(
            order=order,
            name_snapshot="Envase para llevar",
            unit_price=order.packaging_fee,
            quantity=1,
            subtotal=order.packaging_fee,
        )


class Migration(migrations.Migration):
    dependencies = [("menu", "0004_packaging_types"), ("orders", "0005_order_packaging_fee")]

    operations = [
        migrations.CreateModel(
            name="OrderPackagingItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name_snapshot", models.CharField(max_length=100)),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("quantity", models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("subtotal", models.DecimalField(decimal_places=2, max_digits=10)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="packaging_items", to="orders.order")),
                ("packaging_type", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="order_packaging_items", to="menu.packagingtype")),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.RunPython(preserve_existing_fees, migrations.RunPython.noop),
    ]
