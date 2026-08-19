from django.urls import path

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
        "products/new/",
        views.product_create,
        name="product_create",
    ),
    path(
        "products/<int:product_id>/edit/",
        views.product_edit,
        name="product_edit",
    ),
]