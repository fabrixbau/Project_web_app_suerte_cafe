from .permissions import is_administrator


def user_access(request):
    return {"is_administrator": is_administrator(request.user)}
