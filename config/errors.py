from django.shortcuts import render


ERROR_CONTENT = {
    400: ("Solicitud incorrecta", "No pudimos procesar la información enviada."),
    403: ("Acceso restringido", "Tu usuario no tiene permiso para realizar esta acción."),
    404: ("Página no encontrada", "La página o el registro que buscas no existe."),
    500: ("Ocurrió un problema", "El sistema encontró un error inesperado. Intenta nuevamente."),
}


def render_error(request, status):
    title, description = ERROR_CONTENT[status]
    return render(
        request,
        "errors/error_page.html",
        {"error_code": status, "error_title": title, "error_description": description},
        status=status,
    )


def bad_request(request, exception):
    return render_error(request, 400)


def permission_denied(request, exception):
    return render_error(request, 403)


def page_not_found(request, exception):
    return render_error(request, 404)


def server_error(request):
    return render_error(request, 500)


def error_preview(request, status):
    """Development-only URL used to inspect friendly error pages safely."""
    if status not in ERROR_CONTENT:
        status = 404
    return render_error(request, status)
