import json

from django.contrib import messages
from django.contrib.auth.decorators import (
    login_required,
    permission_required,
)
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from .customization import (
    customization_group_library,
    parse_customization_payload,
    serialize_product_customization,
    sync_product_customization,
)
from .forms import (
    BusinessSettingsForm,
    PackagingTypeForm,
    CategoryForm,
    ProductForm,
)
from .models import BusinessSettings, Category, PackagingType, Product


@login_required
@permission_required("menu.change_product", raise_exception=True)
def product_configuration(request, product_id):
    # Los ingredientes/complementos ahora se editan directamente dentro del formulario
    # del producto (editor integrado); esta URL se conserva porque ya estaba enlazada
    # desde la tabla de productos, y sólo redirige hacia esa sección del formulario.
    get_object_or_404(Product, id=product_id)
    return redirect(f"{reverse('menu:product_edit', args=(product_id,))}#product-ingredients")


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
    active_tab = request.GET.get("tab", "products")
    if active_tab not in {"products", "categories", "settings"}:
        active_tab = "products"
    if active_tab == "settings" and not request.user.has_perm("menu.change_product"):
        active_tab = "products"

    categories = Category.objects.annotate(
        product_count=Count("products"),
    ).order_by("name")
    products = Product.objects.select_related("category").order_by(
        "category__name",
        "name",
    )

    search = request.GET.get("q", "").strip()
    category_id = request.GET.get("category", "").strip()
    availability = request.GET.get("availability", "").strip()

    if search:
        products = products.filter(
            Q(name__icontains=search) | Q(description__icontains=search)
        )
    if category_id.isdigit():
        products = products.filter(category_id=category_id)
    if availability == "available":
        products = products.filter(is_available=True)
    elif availability == "unavailable":
        products = products.filter(is_available=False)

    return render(
        request,
        "menu/menu_configuration.html",
        {
            "categories": categories,
            "products": products,
            "active_tab": active_tab,
            "search": search,
            "selected_category": category_id,
            "availability": availability,
            "business_settings_form": BusinessSettingsForm(instance=BusinessSettings.load()) if request.user.has_perm("menu.change_product") else None,
            "packaging_types": PackagingType.objects.annotate(product_count=Count("products")) if request.user.has_perm("menu.change_product") else (),
        },
    )


@login_required
@permission_required("menu.change_product", raise_exception=True)
@require_POST
def business_settings_update(request):
    settings_object = BusinessSettings.load()
    form = BusinessSettingsForm(request.POST, instance=settings_object)
    if form.is_valid():
        form.save()
        messages.success(request, "La configuración de envases fue actualizada.")
    else:
        for field_errors in form.errors.values():
            for error in field_errors:
                messages.error(request, error)
    return redirect(f"{reverse('menu:configuration')}?tab=settings")


@login_required
@permission_required("menu.change_product", raise_exception=True)
def packaging_type_form(request, packaging_type_id=None):
    packaging_type = get_object_or_404(PackagingType, id=packaging_type_id) if packaging_type_id else None
    initial = None
    if not packaging_type and request.method != "POST":
        last_order = PackagingType.objects.order_by("-sort_order").values_list("sort_order", flat=True).first()
        initial = {"sort_order": (last_order + 1) if last_order is not None else 0}
    form = PackagingTypeForm(request.POST or None, instance=packaging_type, initial=initial)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "El tipo de envase fue guardado.")
        return redirect(f"{reverse('menu:configuration')}?tab=settings")
    return render(request, "menu/packaging_type_form.html", {"form": form, "packaging_type": packaging_type})


@login_required
@permission_required("menu.change_product", raise_exception=True)
@require_POST
def packaging_type_delete(request, packaging_type_id):
    packaging_type = get_object_or_404(PackagingType, id=packaging_type_id)
    packaging_type.delete()
    messages.success(request, "El tipo de envase fue eliminado.")
    return redirect(f"{reverse('menu:configuration')}?tab=settings")


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
    customization_data, clean_groups = customization_submission(request, form)

    if request.method == "POST" and form.is_valid() and clean_groups is not None:
        with transaction.atomic():
            product = form.save()
            sync_product_customization(product, clean_groups)

        messages.success(
            request,
            f"El producto {product.name} y sus ingredientes fueron creados.",
        )

        return redirect("menu:configuration")

    return render(
        request,
        "menu/product_form.html",
        {
            "form": form,
            "title": "Nuevo producto",
            "customization_data": customization_data,
            "customization_library": customization_group_library(),
        },
    )


@login_required
@permission_required("menu.change_product", raise_exception=True)
def product_edit(request, product_id):
    product = get_object_or_404(
        Product.objects.prefetch_related("option_groups__options"),
        id=product_id,
    )

    form = ProductForm(
        request.POST or None,
        request.FILES or None,
        instance=product,
    )
    customization_data, clean_groups = customization_submission(request, form, product=product)

    if request.method == "POST" and form.is_valid() and clean_groups is not None:
        with transaction.atomic():
            product = form.save()
            sync_product_customization(product, clean_groups)

        messages.success(
            request,
            f"El producto {product.name} y sus ingredientes fueron actualizados.",
        )

        return redirect("menu:configuration")

    return render(
        request,
        "menu/product_form.html",
        {
            "form": form,
            "title": f"Editar producto: {product.name}",
            "product": product,
            "customization_data": customization_data,
            "customization_library": customization_group_library(exclude_product=product),
        },
    )


def customization_submission(request, form, product=None):
    if request.method != "POST":
        return (serialize_product_customization(product) if product else []), []
    raw_payload = request.POST.get("customization_data", "[]")
    try:
        display_data = json.loads(raw_payload)
        if not isinstance(display_data, list):
            display_data = []
    except (TypeError, json.JSONDecodeError):
        display_data = []
    try:
        clean_groups = parse_customization_payload(raw_payload)
    except ValidationError as error:
        form.add_error(None, error.message)
        clean_groups = None
    return display_data, clean_groups


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

    next_url = request.POST.get("next")
    if next_url and url_has_allowed_host_and_scheme(
        url=next_url,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return redirect(next_url)

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
