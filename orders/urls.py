from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path("new/", views.order_create, name="create"),
    path("", views.order_list, name="list"),
    path(
        "<int:order_id>/status/",
        views.order_status_update,
        name="status_update",
    ),
]