from django.contrib import messages
from django.contrib.auth.decorators import (
    login_required,
    permission_required,
)
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from .forms import (
    BusinessSettingsForm,
    PackagingTypeForm,
    CategoryForm,
    ProductForm,
    ProductOptionForm,
    ProductOptionGroupForm,
    ProductOptionGroupCopyForm,
)
from .models import BusinessSettings, Category, PackagingType, Product, ProductOption, ProductOptionGroup


@login_required
@permission_required("menu.change_product", raise_exception=True)
def product_configuration(request, product_id):
    product = get_object_or_404(
        Product.objects.prefetch_related("option_groups__options"),
        id=product_id,
    )
    return render(request, "menu/product_configuration.html", {"product": product})


@login_required
@permission_required("menu.change_product", raise_exception=True)
def option_group_form(request, product_id, group_id=None):
    product = get_object_or_404(Product, id=product_id)
    group = (
        get_object_or_404(ProductOptionGroup, id=group_id, product=product)
        if group_id
        else ProductOptionGroup(product=product)
    )
    form = ProductOptionGroupForm(request.POST or None, instance=group)
    if request.method == "POST" and form.is_valid():
        duplicate = ProductOptionGroup.objects.filter(
            product=product,
            name__iexact=form.cleaned_data["name"],
        ).exclude(id=group.id)
        if duplicate.exists():
            form.add_error("name", "Ya existe un grupo con este nombre.")
    if request.method == "POST" and form.is_valid():
        group = form.save(commit=False)
        group.product = product
        group.save()
        messages.success(request, "El grupo de opciones fue guardado.")
        return redirect("menu:product_configuration", product_id=product.id)
    return render(
        request,
        "menu/customization_form.html",
        {"form": form, "product": product, "title": "Grupo de opciones"},
    )


@login_required
@permission_required("menu.change_product", raise_exception=True)
def option_group_copy(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    form = ProductOptionGroupCopyForm(request.POST or None, target_product=product)
    if request.method == "POST" and form.is_valid():
        source = form.cleaned_data["source_group"]
        if ProductOptionGroup.objects.filter(product=product, name__iexact=source.name).exists():
            form.add_error("source_group", f"{product.name} ya tiene un grupo llamado {source.name}.")
        else:
            with transaction.atomic():
                copied_group = ProductOptionGroup.objects.create(
                    product=product,
                    name=source.name,
                    selection_type=source.selection_type,
                    is_required=source.is_required,
                    sort_order=source.sort_order,
                )
                ProductOption.objects.bulk_create([
                    ProductOption(
                        group=copied_group,
                        name=option.name,
                        price_adjustment=option.price_adjustment,
                        is_default=option.is_default,
                        is_available=option.is_available,
                        sort_order=option.sort_order,
                    )
                    for option in source.options.all()
                ])
            messages.success(request, f"El grupo {source.name} fue copiado desde {source.product.name}.")
            return redirect("menu:product_configuration", product_id=product.id)
    return render(
        request,
        "menu/customization_form.html",
        {"form": form, "product": product, "title": "Pegar grupo existente"},
    )


@login_required
@permission_required("menu.change_product", raise_exception=True)
def product_option_form(request, product_id, group_id, option_id=None):
    product = get_object_or_404(Product, id=product_id)
    group = get_object_or_404(ProductOptionGroup, id=group_id, product=product)
    option = (
        get_object_or_404(ProductOption, id=option_id, group=group)
        if option_id
        else ProductOption(group=group)
    )
    form = ProductOptionForm(request.POST or None, instance=option)
    if request.method == "POST" and form.is_valid():
        duplicate = ProductOption.objects.filter(
            group=group,
            name__iexact=form.cleaned_data["name"],
        ).exclude(id=option.id)
        if duplicate.exists():
            form.add_error("name", "Ya existe una opción con este nombre.")
    if request.method == "POST" and form.is_valid():
        option = form.save(commit=False)
        option.group = group
        option.save()
        if option.is_default and group.selection_type == ProductOptionGroup.SelectionType.SINGLE:
            group.options.exclude(id=option.id).update(is_default=False)
        messages.success(request, "La opción fue guardada.")
        return redirect("menu:product_configuration", product_id=product.id)
    return render(
        request,
        "menu/customization_form.html",
        {"form": form, "product": product, "title": f"Opción de {group.name}"},
    )


@login_required
@permission_required("menu.change_product", raise_exception=True)
@require_POST
def option_group_delete(request, product_id, group_id):
    group = get_object_or_404(ProductOptionGroup, id=group_id, product_id=product_id)
    group.delete()
    return redirect("menu:product_configuration", product_id=product_id)


@login_required
@permission_required("menu.change_product", raise_exception=True)
@require_POST
def product_option_delete(request, product_id, group_id, option_id):
    option = get_object_or_404(
        ProductOption,
        id=option_id,
        group_id=group_id,
        group__product_id=product_id,
    )
    option.delete()
    return redirect("menu:product_configuration", product_id=product_id)


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
    form = PackagingTypeForm(request.POST or None, instance=packaging_type)
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

    if request.method == "POST" and form.is_valid():
        product = form.save()

        messages.success(
            request,
            f"El producto {product.name} fue creado.",
        )

        return redirect("menu:product_configuration", product_id=product.id)

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
            "product": product,
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
