from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0009_dailyreconciliation_expense"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="customization_comment",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
