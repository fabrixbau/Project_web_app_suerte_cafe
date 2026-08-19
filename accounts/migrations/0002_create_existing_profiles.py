from django.conf import settings
from django.db import migrations


def create_existing_profiles(apps, schema_editor):
    app_label, model_name = settings.AUTH_USER_MODEL.split(".")
    user_model = apps.get_model(app_label, model_name)
    profile_model = apps.get_model("accounts", "Profile")

    for user_id in user_model.objects.values_list("id", flat=True):
        profile_model.objects.get_or_create(user_id=user_id)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            create_existing_profiles,
            migrations.RunPython.noop,
        ),
    ]
