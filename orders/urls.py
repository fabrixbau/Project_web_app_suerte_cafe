from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path("new/", views.order_create, name="create"),
    path(
        "delivery-customer/",
        views.delivery_customer_lookup,
        name="delivery_customer_lookup",
    ),
    path("reports/", views.sales_report, name="reports"),
    path("reports/reconciliation/", views.reconciliation_report, name="reconciliation"),
    path("reports/reconciliation/expenses/<int:expense_id>/delete/", views.expense_delete, name="expense_delete"),
    path("customers/", views.customer_list, name="customer_list"),
    path("customers/new/", views.customer_form, name="customer_create"),
    path("customers/<int:customer_id>/edit/", views.customer_form, name="customer_edit"),
    path("customers/<int:customer_id>/delete/", views.customer_delete, name="customer_delete"),
    path("kitchen/", views.kitchen_view, name="kitchen"),
    path("kitchen/live/", views.kitchen_live, name="kitchen_live"),
    path("", views.order_list, name="list"),
    path("live/", views.orders_live, name="live"),
    path(
        "<int:order_id>/status/",
        views.order_status_update,
        name="status_update",
    ),
    path(
        "<int:order_id>/update-bar-status/",
        views.update_bar_status,
        name="update_bar_status",
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
