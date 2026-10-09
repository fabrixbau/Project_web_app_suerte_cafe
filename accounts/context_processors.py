import re

from django.utils import timezone

from .permissions import is_administrator


def user_access(request):
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    # Chrome/Firefox on iOS also use WebKit. Detect the operating system instead
    # of the browser brand so the compatibility layer reaches every iOS 9 iPad.
    legacy_ios9 = bool(
        re.search(r"(?:CPU(?: iPhone)? OS|iPhone OS) 9[_\.]", user_agent, re.I)
    )
    pending_order_notifications = 0
    if request.user.is_authenticated:
        from orders.models import Order
        pending_order_notifications = Order.objects.filter(
            operating_date=timezone.localdate(), needs_attention=True
        ).count()
    return {
        "is_administrator": is_administrator(request.user),
        "legacy_ios9": legacy_ios9,
        "pending_order_notifications": pending_order_notifications,
    }
