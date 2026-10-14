from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("menu", "0009_product_is_visible_to_customers"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="requires_customization",
            field=models.BooleanField(
                default=False,
                help_text="Abre la personalización antes de poder agregarlo al pedido.",
            ),
        ),
    ]
