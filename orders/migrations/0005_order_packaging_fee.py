from decimal import Decimal

from django.db import migrations, models
from django.core.validators import MinValueValidator


class Migration(migrations.Migration):
    dependencies = [("orders", "0004_orderitem_configuration")]

    operations = [
        migrations.AddField(
            model_name="order",
            name="packaging_fee",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                max_digits=10,
                validators=[MinValueValidator(Decimal("0.00"))],
            ),
        ),
    ]
