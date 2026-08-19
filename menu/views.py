from django.contrib import messages
from django.contrib.auth.decorators import (
    login_required,
    permission_required,
)
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import CategoryForm, ProductForm
from .models import Category, Product


@login_required
@permission_required("menu.change_category", raise_exception=True)
def category_edit(request, category_id):
    category = get_object_or_404(
        Category,
        id=category_id,
    )

    form = CategoryForm(
        request.POST or None,
        request.FILES or None,
        instance=category,
    )

    if request.method == "POST" and form.is_valid():
        category = form.save()

        messages.success(
            request,
            f"La categoría {category.name} fue actualizada.",
        )

        return redirect("menu:configuration")

    return render(
        request,
        "menu/category_form.html",
        {
            "form": form,
            "title": f"Editar categoría: {category.name}",
        },
    )


@login_required
def menu_list(request):
    available_products = Product.objects.filter(is_available=True)

    categories = Category.objects.prefetch_related(
        Prefetch(
            "products",
            queryset=available_products,
            to_attr="available_products",
        )
    )

    return render(
        request,
        "menu/menu_list.html",
        {"categories": categories},
    )


@login_required
@permission_required("menu.view_category", raise_exception=True)
def menu_configuration(request):
    categories = Category.objects.prefetch_related(
        "products",
    ).order_by("name")

    return render(
        request,
        "menu/menu_configuration.html",
        {"categories": categories},
    )


@login_required
@permission_required("menu.add_category", raise_exception=True)
def category_create(request):
    form = CategoryForm(
        request.POST or None,
        request.FILES or None,
    )

    if request.method == "POST" and form.is_valid():
        category = form.save()

        messages.success(
            request,
            f"La categoría {category.name} fue creada.",
        )

        return redirect("menu:configuration")

    return render(
        request,
        "menu/category_form.html",
        {
            "form": form,
            "title": "Nueva categoría",
        },
    )


@login_required
@permission_required("menu.delete_category", raise_exception=True)
def category_delete(request, category_id):
    category = get_object_or_404(
        Category,
        id=category_id,
    )
    has_products = category.products.exists()

    if request.method == "POST":
        if has_products:
            messages.error(
                request,
                "No puedes eliminar una categoría que contiene productos.",
            )
        else:
            category_name = category.name
            category.delete()

            messages.success(
                request,
                f"La categoría {category_name} fue eliminada.",
            )

        return redirect("menu:configuration")

    return render(
        request,
        "menu/category_confirm_delete.html",
        {
            "category": category,
            "has_products": has_products,
        },
    )


@login_required
@permission_required("menu.add_product", raise_exception=True)
def product_create(request):
    form = ProductForm(
        request.POST or None,
        request.FILES or None,
    )

    if request.method == "POST" and form.is_valid():
        product = form.save()

        messages.success(
            request,
            f"El producto {product.name} fue creado.",
        )

        return redirect("menu:configuration")

    return render(
        request,
        "menu/product_form.html",
        {
            "form": form,
            "title": "Nuevo producto",
        },
    )


@login_required
@permission_required("menu.change_product", raise_exception=True)
def product_edit(request, product_id):
    product = get_object_or_404(
        Product,
        id=product_id,
    )

    form = ProductForm(
        request.POST or None,
        request.FILES or None,
        instance=product,
    )

    if request.method == "POST" and form.is_valid():
        product = form.save()

        messages.success(
            request,
            f"El producto {product.name} fue actualizado.",
        )

        return redirect("menu:configuration")

    return render(
        request,
        "menu/product_form.html",
        {
            "form": form,
            "title": f"Editar producto: {product.name}",
        },
    )


@login_required
@permission_required("menu.change_product", raise_exception=True)
@require_POST
def product_toggle_availability(request, product_id):
    product = get_object_or_404(
        Product,
        id=product_id,
    )

    product.is_available = not product.is_available
    product.save(update_fields=["is_available"])

    availability = (
        "disponible"
        if product.is_available
        else "no disponible"
    )

    messages.success(
        request,
        f"{product.name} ahora está {availability}.",
    )

    return redirect("menu:configuration")


@login_required
@permission_required("menu.delete_product", raise_exception=True)
def product_delete(request, product_id):
    product = get_object_or_404(
        Product,
        id=product_id,
    )

    if request.method == "POST":
        product_name = product.name
        product.delete()

        messages.success(
            request,
            f"El producto {product_name} fue eliminado.",
        )

        return redirect("menu:configuration")

    return render(
        request,
        "menu/product_confirm_delete.html",
        {"product": product},
    )
