# Generated manually for the public QR menu.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("menu", "0008_productoption_replacement_pair"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="is_visible_to_customers",
            field=models.BooleanField(default=True, help_text="Controla si aparece en el menú público del QR."),
        ),
    ]
