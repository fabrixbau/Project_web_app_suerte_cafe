import re

from .permissions import is_administrator


def user_access(request):
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    # Chrome/Firefox on iOS also use WebKit. Detect the operating system instead
    # of the browser brand so the compatibility layer reaches every iOS 9 iPad.
    legacy_ios9 = bool(
        re.search(r"(?:CPU(?: iPhone)? OS|iPhone OS) 9[_\.]", user_agent, re.I)
    )
    return {
        "is_administrator": is_administrator(request.user),
        "legacy_ios9": legacy_ios9,
    }
