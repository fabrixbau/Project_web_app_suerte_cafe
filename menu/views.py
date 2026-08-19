from django.contrib import messages
from django.contrib.auth.decorators import (
    login_required,
    permission_required,
)
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404, redirect, render

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