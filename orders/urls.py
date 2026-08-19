from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path("new/", views.order_create, name="create"),
    path("reports/", views.sales_report, name="reports"),
    path("", views.order_list, name="list"),
    path(
        "<int:order_id>/status/",
        views.order_status_update,
        name="status_update",
    ),
    path(
        "<int:order_id>/edit/",
        views.order_edit,
        name="edit",
    ),
    path(
        "<int:order_id>/",
        views.order_detail,
        name="detail",
    ),
]
