from django.db import migrations


def configure_permissions(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    administrator, _ = Group.objects.get_or_create(name="Administrador")
    regular_user, _ = Group.objects.get_or_create(name="Usuario regular")

    administrator_permissions = Permission.objects.filter(
        content_type__app_label__in=["auth", "menu", "orders"],
        codename__in=[
            "add_user",
            "change_user",
            "view_user",
            "delete_user",
            "view_category",
            "add_category",
            "change_category",
            "delete_category",
            "view_product",
            "add_product",
            "change_product",
            "delete_product",
            "view_order",
            "add_order",
            "change_order",
            "view_deliverycustomer",
        ],
    )
    administrator.permissions.add(*administrator_permissions)

    regular_permissions = Permission.objects.filter(
        content_type__app_label="orders",
        codename__in=["view_order", "add_order", "change_order"],
    )
    regular_user.permissions.add(*regular_permissions)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_remove_profile_display_name"),
        ("orders", "0003_deliverycustomer"),
    ]

    operations = [
        migrations.RunPython(configure_permissions, migrations.RunPython.noop),
    ]
