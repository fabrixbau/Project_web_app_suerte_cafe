# Generated manually for public QR orders.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0011_order_bar_completed_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="cash_tendered",
            field=models.DecimalField(blank=True, decimal_places=2, help_text="Monto indicado por el cliente antes de cobrar.", max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_customer",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orders", to="orders.deliverycustomer"),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_status",
            field=models.CharField(choices=[("pending", "Pendiente de pago"), ("paid", "Pagado")], default="paid", max_length=20),
        ),
        migrations.AddField(
            model_name="order",
            name="source",
            field=models.CharField(choices=[("internal", "Captura interna"), ("public_qr", "Pedido QR")], default="internal", max_length=20),
        ),
    ]
