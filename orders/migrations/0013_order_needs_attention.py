# Generated manually for persistent order alerts.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0012_order_public_qr_payment_state"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="needs_attention",
            field=models.BooleanField(default=False),
        ),
    ]
