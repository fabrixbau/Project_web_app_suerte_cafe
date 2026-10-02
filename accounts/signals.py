from django.conf import settings
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver

from .attendance import register_check_in
from .models import Profile


ADMINISTRATOR_GROUP = "Administrador"
REGULAR_USER_GROUP = "Usuario regular"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)


@receiver(user_logged_in)
def register_daily_attendance(sender, request, user, **kwargs):
    register_check_in(user)


@receiver(post_migrate)
def create_default_groups(sender, **kwargs):
    if sender.name not in {"accounts", "auth", "menu", "orders"}:
        return

    administrator, _ = Group.objects.get_or_create(
        name=ADMINISTRATOR_GROUP,
    )
    regular_user, _ = Group.objects.get_or_create(name=REGULAR_USER_GROUP)

    permission_map = {
        "menu": [
            "view_category",
            "add_category",
            "change_category",
            "delete_category",
            "view_product",
            "add_product",
            "change_product",
            "delete_product",
        ],
        "auth": [
            "add_user",
            "change_user",
            "view_user",
            "delete_user",
        ],
        "orders": [
            "view_order",
            "add_order",
            "change_order",
            "view_deliverycustomer",
        ],
    }

    for app_label, codenames in permission_map.items():
        permissions = Permission.objects.filter(
            content_type__app_label=app_label,
            codename__in=codenames,
        )
        administrator.permissions.add(*permissions)

    regular_permissions = Permission.objects.filter(
        content_type__app_label="orders",
        codename__in=["view_order", "add_order", "change_order"],
    )
    regular_user.permissions.add(*regular_permissions)
