from django.db import migrations, models
from django.db.models import F


def backfill_bar_completion_times(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(cold_bar_status="completed").update(cold_bar_completed_at=F("updated_at"))
    Order.objects.filter(hot_bar_status="completed").update(hot_bar_completed_at=F("updated_at"))


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0010_orderitem_customization_comment"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="cold_bar_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="hot_bar_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_bar_completion_times, migrations.RunPython.noop),
    ]
