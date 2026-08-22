from django.contrib import messages
from django.contrib.auth.decorators import login_required, permission_required
from django.core.exceptions import ValidationError
from datetime import timedelta
from decimal import Decimal
import json

from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Avg, Count, DecimalField, IntegerField, Prefetch, Sum
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from menu.models import BusinessSettings, Category, PackagingType, Product, ProductOption

from .forms import (
    OrderCreateForm,
    OrderFilterForm,
    OrderInformationEditForm,
    SalesReportFilterForm,
)
from .models import DeliveryCustomer, Order, OrderItem, normalize_customer_name
from .services import create_order, update_complete_order


def packaging_context(order=None, posted_value=None):
    types = list(PackagingType.objects.filter(is_active=True).order_by("sort_order", "name"))
    catalog = [{"id": item.id, "name": item.name, "price": str(item.price)} for item in types]
    if posted_value is not None:
        selected = posted_value
    elif order:
        selected = json.dumps([
            {"packaging_type_id": item.packaging_type_id, "quantity": item.quantity}
            for item in order.packaging_items.all() if item.packaging_type_id
        ])
    else:
        selected = "[]"
    return {
        "packaging_catalog": catalog,
        "packaging_items_value": selected,
        "automatic_packaging": BusinessSettings.load().automatic_packaging_fee,
        "packaging_selection_initialized": order is not None or posted_value is not None,
    }


def parse_packaging_items(request, errors):
    try:
        payload = json.loads(request.POST.get("packaging_items", "[]"))
    except (TypeError, ValueError, json.JSONDecodeError):
        errors.append("No fue posible leer los envases del pedido.")
        return []
    if not isinstance(payload, list) or len(payload) > 30:
        errors.append("La selección de envases no es válida.")
        return []
    items = []
    for item in payload:
        try:
            packaging_type_id = int(item["packaging_type_id"])
            quantity = int(item["quantity"])
        except (KeyError, TypeError, ValueError):
            errors.append("Un envase contiene datos inválidos.")
            continue
        if quantity < 1 or quantity > 99:
            errors.append("La cantidad de un envase no es válida.")
            continue
        items.append({"packaging_type_id": packaging_type_id, "quantity": quantity})
    return items


def prepare_product_customizations(products):
    payload = {}
    for product in products:
        groups_payload = []
        standard_adjustment = Decimal("0.00")
        for group in product.option_groups.all():
            options_payload = []
            for option in group.available_options:
                options_payload.append(
                    {
                        "id": option.id,
                        "name": option.name,
                        "price_adjustment": str(option.price_adjustment),
                        "is_default": option.is_default,
                    }
                )
                if option.is_default:
                    standard_adjustment += option.price_adjustment
            groups_payload.append(
                {
                    "id": group.id,
                    "name": group.name,
                    "selection_type": group.selection_type,
                    "is_required": group.is_required,
                    "options": options_payload,
                }
            )
        product.standard_price = product.price + standard_adjustment
        product.has_options = bool(groups_payload)
        payload[str(product.id)] = {
            "id": product.id,
            "name": product.name,
            "base_price": str(product.price),
            "standard_price": str(product.standard_price),
            "groups": groups_payload,
        }
    return payload


def parse_custom_items(request, errors):
    raw_payload = request.POST.get("custom_items", "[]")
    try:
        payload = json.loads(raw_payload)
    except (TypeError, ValueError, json.JSONDecodeError):
        errors.append("No fue posible leer los productos personalizados.")
        return []
    if not isinstance(payload, list) or len(payload) > 100:
        errors.append("La cantidad de productos personalizados no es válida.")
        return []

    items = []
    for item in payload:
        try:
            product_id = int(item["product_id"])
            quantity = int(item["quantity"])
            option_ids = [int(value) for value in item.get("option_ids", [])]
        except (KeyError, TypeError, ValueError):
            errors.append("Un producto personalizado contiene datos inválidos.")
            continue
        if quantity < 1 or quantity > 99 or len(option_ids) > 50:
            errors.append("Una cantidad o selección personalizada no es válida.")
            continue
        items.append(
            {"product_id": product_id, "quantity": quantity, "option_ids": option_ids}
        )
    return items


@login_required
@permission_required("orders.add_order", raise_exception=True)
def delivery_customer_lookup(request):
    normalized_name = normalize_customer_name(request.GET.get("name", ""))
    if not normalized_name:
        return JsonResponse({"found": False})

    customer = DeliveryCustomer.objects.filter(
        normalized_name=normalized_name
    ).first()
    if not customer:
        return JsonResponse({"found": False})

    return JsonResponse(
        {
            "found": True,
            "customer": {
                "name": customer.name,
                "phone": customer.phone,
                "street": customer.street,
                "exterior_number": customer.exterior_number,
                "interior_number": customer.interior_number,
                "neighborhood": customer.neighborhood,
                "notes": customer.notes,
            },
        }
    )


@login_required
@permission_required("orders.view_order", raise_exception=True)
def order_detail(request, order_id):
    order = get_object_or_404(
        Order.objects.select_related(
            "created_by",
        ).prefetch_related(
            "items__product",
            "packaging_items",
        ),
        id=order_id,
    )


    return render(
        request,
        "orders/order_detail.html",
        {"order": order},
    )


@login_required
@permission_required("orders.change_order", raise_exception=True)
def order_edit(request, order_id):
    order = get_object_or_404(
        Order.objects.prefetch_related("items__product", "packaging_items"), id=order_id
    )
    information_form = OrderInformationEditForm(
        request.POST or None,
        instance=order,
        initial={"packaging_items": json.dumps([
            {"packaging_type_id": item.packaging_type_id, "quantity": item.quantity}
            for item in order.packaging_items.all() if item.packaging_type_id
        ])},
    )

    current_items = list(order.items.all())
    available_options = ProductOption.objects.filter(is_available=True).order_by(
        "sort_order", "id"
    )
    addable_products = Product.objects.filter(is_available=True).select_related("packaging_type").prefetch_related(
        Prefetch(
            "option_groups__options",
            queryset=available_options,
            to_attr="available_options",
        )
    ).order_by("name")
    categories = list(
        Category.objects.prefetch_related(
            Prefetch(
                "products",
                queryset=addable_products,
                to_attr="available_to_add",
            )
        ).order_by("name")
    )
    products = [
        product
        for category in categories
        for product in category.available_to_add
    ]
    product_customizations = prepare_product_customizations(products)
    product_errors = []

    for item in current_items:
        item.selected_quantity = item.quantity
    for product in products:
        product.selected_quantity = 0

    if request.method == "POST":
        item_quantities = {}
        new_items = []

        for item in current_items:
            raw_quantity = request.POST.get(
                f"item_quantity_{item.id}", str(item.quantity)
            )
            try:
                quantity = int(raw_quantity) if str(raw_quantity).strip() else 0
            except (TypeError, ValueError):
                quantity = item.quantity
                product_errors.append(
                    f"Cantidad inválida para {item.product_name_snapshot}."
                )
            if quantity < 0:
                quantity = 0
                product_errors.append(
                    f"La cantidad de {item.product_name_snapshot} no puede ser negativa."
                )
            item.selected_quantity = quantity
            item_quantities[item.id] = quantity

        for product in products:
            raw_quantity = request.POST.get(f"product_quantity_{product.id}", "0")
            try:
                quantity = int(raw_quantity) if str(raw_quantity).strip() else 0
            except (TypeError, ValueError):
                quantity = 0
                product_errors.append(f"Cantidad inválida para {product.name}.")
            if quantity < 0:
                quantity = 0
                product_errors.append(
                    f"La cantidad de {product.name} no puede ser negativa."
                )
            product.selected_quantity = quantity
            if quantity > 0:
                new_items.append({"product_id": product.id, "quantity": quantity})

        new_items.extend(parse_custom_items(request, product_errors))
        packaging_items = parse_packaging_items(request, product_errors)

        if information_form.is_valid() and not product_errors:
            try:
                update_complete_order(
                    order=order,
                    cleaned_data=information_form.cleaned_data,
                    item_quantities=item_quantities,
                    new_items=new_items,
                    packaging_items=packaging_items,
                )
            except ValidationError as error:
                product_errors.extend(error.messages)
            else:
                messages.success(
                    request,
                    f"El pedido {order.formatted_number} fue actualizado.",
                    extra_tags="order-success",
                )
                return redirect("orders:detail", order_id=order.id)

    return render(
        request,
        "orders/order_edit.html",
        {
            "order": order,
            "information_form": information_form,
            "current_items": current_items,
            "products": products,
            "categories": categories,
            "product_errors": product_errors,
            "product_customizations": product_customizations,
            "custom_items_value": request.POST.get("custom_items", "[]"),
            **packaging_context(order, request.POST.get("packaging_items") if request.method == "POST" else None),
        },
    )

@login_required
@permission_required("orders.change_order", raise_exception=True)
@require_POST
def order_status_update(request, order_id):
    is_async = request.headers.get("x-requested-with") == "XMLHttpRequest"
    with transaction.atomic():
        order = get_object_or_404(Order.objects.select_for_update(), id=order_id)
        if request.POST.get("cycle") == "1":
            status_cycle = {
                Order.Status.IN_PROGRESS: Order.Status.COMPLETED,
                Order.Status.COMPLETED: Order.Status.CANCELED,
                Order.Status.CANCELED: Order.Status.IN_PROGRESS,
            }
            new_status = status_cycle[order.status]
        else:
            new_status = request.POST.get("status")

        if new_status not in Order.Status.values:
            error_message = "El estado seleccionado no es válido."
            if is_async:
                return JsonResponse({"ok": False, "error": error_message}, status=400)
            messages.error(request, error_message)
        else:
            order.status = new_status
            order.save(update_fields=["status", "updated_at"])

    if new_status in Order.Status.values:
        if is_async:
            return JsonResponse(
                {
                    "ok": True,
                    "status": order.status,
                    "status_label": order.get_status_display(),
                }
            )
        messages.success(
            request,
            f"El pedido {order.formatted_number} fue actualizado.",
        )

    next_url = request.POST.get("next")
    if next_url and url_has_allowed_host_and_scheme(
        url=next_url,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return redirect(next_url)

    return redirect("orders:list")


@login_required
@permission_required("orders.add_order", raise_exception=True)
def order_create(request):
    available_options = ProductOption.objects.filter(is_available=True).order_by(
        "sort_order", "id"
    )
    products = Product.objects.filter(
        is_available=True,
    ).select_related("category", "packaging_type").prefetch_related(
        Prefetch(
            "option_groups__options",
            queryset=available_options,
            to_attr="available_options",
        )
    ).order_by(
        "category__name",
        "name",
    )
    products = list(products)
    product_customizations = prepare_product_customizations(products)

    form = OrderCreateForm(
        request.POST or None,
        initial={"order_type": Order.OrderType.EAT_IN},
    )
    items = []

    if request.method == "POST":
        form_is_valid = form.is_valid()

        for product in products:
            raw_quantity = request.POST.get(
                f"quantity_{product.id}",
                "0",
            )

            try:
                quantity = int(raw_quantity) if str(raw_quantity).strip() else 0
            except (TypeError, ValueError):
                quantity = 0
                form.add_error(
                    None,
                    f"Cantidad inválida para {product.name}.",
                )

            if quantity < 0:
                quantity = 0
                form.add_error(
                    None,
                    f"La cantidad de {product.name} no puede ser negativa.",
                )

            product.selected_quantity = quantity

            if quantity > 0:
                items.append(
                    {
                        "product_id": product.id,
                        "quantity": quantity,
                    }
                )

        custom_item_errors = []
        items.extend(parse_custom_items(request, custom_item_errors))
        packaging_items = parse_packaging_items(request, custom_item_errors)
        for error in custom_item_errors:
            form.add_error(None, error)

        if not items:
            form.add_error(
                None,
                "Selecciona al menos un producto.",
            )

        if form_is_valid and not form.errors:
            customer_data = form.cleaned_data.copy()
            order_type = customer_data.pop("order_type")
            customer_data.pop("packaging_items", None)

            try:
                order = create_order(
                    user=request.user,
                    order_type=order_type,
                    items=items,
                    customer_data=customer_data,
                    packaging_items=packaging_items,
                )
            except ValidationError as error:
                for message in error.messages:
                    form.add_error(None, message)
            else:
                messages.success(
                    request,
                    f"Pedido #{order.daily_number:03d} guardado.",
                    extra_tags="order-success",
                )
                return redirect("orders:create")
    else:
        for product in products:
            product.selected_quantity = 0

    return render(
        request,
        "orders/order_create.html",
        {
            "form": form,
            "products": products,
            "product_customizations": product_customizations,
            "custom_items_value": request.POST.get("custom_items", "[]"),
            **packaging_context(posted_value=request.POST.get("packaging_items") if request.method == "POST" else None),
        },
    )


@login_required
@permission_required("orders.view_order", raise_exception=True)
def order_list(request):
    orders = Order.objects.select_related(
        "created_by",
    ).order_by("-created_at")

    filter_form = OrderFilterForm(request.GET)

    if filter_form.is_valid():
        filters = filter_form.cleaned_data
        date_from = filters["date"]
        date_to = filters["date_to"]

        if date_from and date_to:
            orders = orders.filter(
                operating_date__range=(date_from, date_to),
            )
        elif date_from or date_to:
            orders = orders.filter(
                operating_date=date_from or date_to,
            )
        else:
            orders = orders.filter(operating_date=timezone.localdate())

        if filters["order_number"]:
            orders = orders.filter(
                daily_number=filters["order_number"],
            )

        if filters["customer"]:
            orders = orders.filter(
                customer_name__icontains=filters["customer"],
            )

        if filters["status"]:
            orders = orders.filter(
                status=filters["status"],
            )

        if filters["order_type"]:
            orders = orders.filter(
                order_type=filters["order_type"],
            )

        if filters["employee"]:
            orders = orders.filter(
                employee_name_snapshot__icontains=filters["employee"],
            )
    else:
        orders = orders.filter(operating_date=timezone.localdate())

    paginator = Paginator(orders, 20)
    page = paginator.get_page(request.GET.get("page"))

    query_params = request.GET.copy()
    query_params.pop("page", None)

    return render(
        request,
        "orders/order_list.html",
        {
            "page": page,
            "filter_form": filter_form,
            "filter_query": query_params.urlencode(),
            "status_choices": Order.Status.choices,
        },
    )


@login_required
@permission_required("orders.view_order", raise_exception=True)
def sales_report(request):
    filter_form = SalesReportFilterForm(request.GET or None)
    today = timezone.localdate()
    date_from = today
    date_to = today

    if filter_form.is_valid():
        filters = filter_form.cleaned_data
        period = filters["period"]
        if period == "yesterday":
            date_from = date_to = today - timedelta(days=1)
        elif period == "week":
            date_from = today - timedelta(days=today.weekday())
        elif period == "month":
            date_from = today.replace(day=1)
        elif period == "custom":
            date_from = filters["date_from"]
            date_to = filters["date_to"]
    else:
        filters = {}

    period_orders = Order.objects.filter(
        operating_date__range=(date_from, date_to)
    )
    completed_orders = period_orders.filter(status=Order.Status.COMPLETED)
    money_field = DecimalField(max_digits=12, decimal_places=2)
    summary = completed_orders.aggregate(
        total_sales=Coalesce(
            Sum("total"), Decimal("0.00"), output_field=money_field
        ),
        completed_count=Count("id"),
        average_order=Coalesce(
            Avg("total"), Decimal("0.00"), output_field=money_field
        ),
    )
    summary["canceled_count"] = period_orders.filter(
        status=Order.Status.CANCELED
    ).count()

    totals_by_type = {
        row["order_type"]: row
        for row in completed_orders.values("order_type").annotate(
            total=Coalesce(
                Sum("total"), Decimal("0.00"), output_field=money_field
            ),
            count=Count("id"),
        )
    }
    maximum_type_total = max(
        (row["total"] for row in totals_by_type.values()),
        default=Decimal("0.00"),
    )
    sales_by_type = []
    for value, label in Order.OrderType.choices:
        row = totals_by_type.get(
            value,
            {"total": Decimal("0.00"), "count": 0},
        )
        bar_width = (
            float(row["total"] / maximum_type_total * 100)
            if maximum_type_total
            else 0
        )
        sales_by_type.append(
            {
                "label": label,
                "total": row["total"],
                "count": row["count"],
                "bar_width": round(bar_width, 2),
            }
        )

    best_selling_products = (
        OrderItem.objects.filter(
            order__operating_date__range=(date_from, date_to),
            order__status=Order.Status.COMPLETED,
        )
        .values("product_name_snapshot")
        .annotate(
            units_sold=Sum("quantity"),
            sales=Sum("subtotal"),
        )
        .order_by("-units_sold", "product_name_snapshot")[:10]
    )

    detail_orders = period_orders.select_related("created_by").annotate(
        item_count=Coalesce(
            Sum("items__quantity"),
            0,
            output_field=IntegerField(),
        )
    )
    if filters:
        if filters["order_type"]:
            detail_orders = detail_orders.filter(order_type=filters["order_type"])
        if filters["status"]:
            detail_orders = detail_orders.filter(status=filters["status"])
        if filters["employee"]:
            detail_orders = detail_orders.filter(
                employee_name_snapshot__icontains=filters["employee"]
            )
        if filters["customer"]:
            detail_orders = detail_orders.filter(
                customer_name__icontains=filters["customer"]
            )
        if filters["order_number"]:
            detail_orders = detail_orders.filter(
                daily_number=filters["order_number"]
            )

    detail_orders = detail_orders.order_by("-created_at")
    paginator = Paginator(detail_orders, 30)
    page = paginator.get_page(request.GET.get("page"))
    query_params = request.GET.copy()
    query_params.pop("page", None)

    return render(
        request,
        "orders/sales_report.html",
        {
            "filter_form": filter_form,
            "date_from": date_from,
            "date_to": date_to,
            "summary": summary,
            "sales_by_type": sales_by_type,
            "best_selling_products": best_selling_products,
            "page": page,
            "filter_query": query_params.urlencode(),
        },
    )
