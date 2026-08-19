from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_create_existing_profiles"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="profile",
            name="display_name",
        ),
    ]
