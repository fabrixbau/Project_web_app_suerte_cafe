from functools import wraps

from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import PermissionDenied

from .signals import ADMINISTRATOR_GROUP


def is_administrator(user):
    return bool(
        user.is_authenticated
        and (
            user.is_superuser
            or user.groups.filter(name=ADMINISTRATOR_GROUP).exists()
        )
    )


def administrator_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path())
        if not is_administrator(request.user):
            raise PermissionDenied
        return view(request, *args, **kwargs)

    return wrapped
