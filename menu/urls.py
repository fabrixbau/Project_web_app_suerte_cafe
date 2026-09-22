from django.urls import path

from accounts.permissions import administrator_required

from . import views

app_name = "menu"

urlpatterns = [
    path("", views.menu_list, name="list"),
    path(
        "configuration/",
        views.menu_configuration,
        name="configuration",
    ),
    path(
        "categories/new/",
        views.category_create,
        name="category_create",
    ),
    path(
        "categories/<int:category_id>/edit/",
        views.category_edit,
        name="category_edit",
    ),
    path(
        "categories/<int:category_id>/delete/",
        views.category_delete,
        name="category_delete",
    ),
    path(
        "products/new/",
        views.product_create,
        name="product_create",
    ),
    path(
        "products/<int:product_id>/edit/",
        views.product_edit,
        name="product_edit",
    ),
    path("configuration/business/", views.business_settings_update, name="business_settings_update"),
    path("configuration/packaging/new/", views.packaging_type_form, name="packaging_type_create"),
    path("configuration/packaging/<int:packaging_type_id>/edit/", views.packaging_type_form, name="packaging_type_edit"),
    path("configuration/packaging/<int:packaging_type_id>/delete/", views.packaging_type_delete, name="packaging_type_delete"),
    path("products/<int:product_id>/options/", views.product_configuration, name="product_configuration"),
    path(
        "products/<int:product_id>/availability/",
        views.product_toggle_availability,
        name="product_toggle_availability",
    ),
    path(
        "products/<int:product_id>/delete/",
        views.product_delete,
        name="product_delete",
    ),
]

# Todo el módulo de menú es exclusivo para administradores, incluso por URL directa.
for pattern in urlpatterns:
    pattern._callback = administrator_required(pattern.callback)
