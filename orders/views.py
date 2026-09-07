from django.contrib import messages
from django.contrib.auth.decorators import login_required, permission_required
from django.core.exceptions import ValidationError
from datetime import timedelta
from decimal import Decimal
import json

from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Avg, Count, DecimalField, IntegerField, Prefetch, Q, Sum
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from menu.models import BusinessSettings, Category, PackagingType, Product, ProductOption
from accounts.permissions import administrator_required

from .forms import (
    OrderCreateForm,
    DeliveryCustomerForm,
    DailyReconciliationForm,
    ExpenseForm,
    OrderFilterForm,
    OrderInformationEditForm,
    SalesReportFilterForm,
)
from .models import DailyReconciliation, DeliveryCustomer, Expense, Order, OrderItem, normalize_customer_name
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
    addable_products = Product.objects.filter(is_available=True).select_related(
        "category", "category__default_packaging_type", "packaging_type"
    ).prefetch_related(
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
            update_fields = ["status", "updated_at"]
            if new_status in {Order.Status.COMPLETED, Order.Status.IN_PROGRESS}:
                bar_status = (
                    Order.BarStatus.COMPLETED
                    if new_status == Order.Status.COMPLETED
                    else Order.BarStatus.PENDING
                )
                stations = set(order.items.values_list("preparation_station_snapshot", flat=True))
                if Category.PreparationStation.COLD in stations:
                    order.cold_bar_status = bar_status
                    update_fields.append("cold_bar_status")
                if Category.PreparationStation.HOT in stations:
                    order.hot_bar_status = bar_status
                    update_fields.append("hot_bar_status")
                order.items.update(preparation_status=bar_status)
            order.save(update_fields=update_fields)

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
    ).select_related("category", "category__default_packaging_type", "packaging_type").prefetch_related(
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
                create_url = reverse("orders:create")
                return redirect(f"{create_url}?created_order={order.id}")
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
def orders_live(request):
    orders = Order.objects.select_related("created_by").order_by("-created_at")
    filter_form = OrderFilterForm(request.GET)
    if filter_form.is_valid():
        filters = filter_form.cleaned_data
        date_from, date_to = filters["date"], filters["date_to"]
        if date_from and date_to:
            orders = orders.filter(operating_date__range=(date_from, date_to))
        elif date_from or date_to:
            orders = orders.filter(operating_date=date_from or date_to)
        else:
            orders = orders.filter(operating_date=timezone.localdate())
        if filters["order_number"]: orders = orders.filter(daily_number=filters["order_number"])
        if filters["customer"]: orders = orders.filter(customer_name__icontains=filters["customer"])
        if filters["status"]: orders = orders.filter(status=filters["status"])
        if filters["order_type"]: orders = orders.filter(order_type=filters["order_type"])
        if filters["employee"]: orders = orders.filter(employee_name_snapshot__icontains=filters["employee"])
    else:
        orders = orders.filter(operating_date=timezone.localdate())
    page = Paginator(orders, 20).get_page(request.GET.get("page"))
    return JsonResponse({"html": render_to_string("orders/_order_rows.html", {"page": page}, request=request)})


@login_required
def kitchen_view(request):
    context = build_kitchen_context(request.GET.get("filter"))
    return render(request, "orders/kitchen_view.html", context)


def build_kitchen_context(filter_mode=None):
    filter_mode = filter_mode if filter_mode in {"cold", "hot", "two_players"} else "two_players"
    orders = list(
        Order.objects.prefetch_related("items").filter(
            operating_date=timezone.localdate(),
            status__in=[Order.Status.IN_PROGRESS, Order.Status.COMPLETED],
        ).order_by("-created_at")
    )
    orders.sort(key=lambda order: order.status == Order.Status.COMPLETED)
    rows = []
    for order in orders:
        items = list(order.items.all())
        cold_items = [item for item in items if item.preparation_station_snapshot == Category.PreparationStation.COLD]
        hot_items = [item for item in items if item.preparation_station_snapshot == Category.PreparationStation.HOT]
        rows.append({
            "order": order,
            "cold_items": cold_items,
            "hot_items": hot_items,
            "cold_quantity": sum(item.quantity for item in cold_items),
            "hot_quantity": sum(item.quantity for item in hot_items),
        })
    return {
        "filter_mode": filter_mode,
        "order_rows": rows,
        "cold_rows": [row for row in rows if row["cold_items"]],
        "hot_rows": [row for row in rows if row["hot_items"]],
        "cold_count": sum(bool(row["cold_items"]) for row in rows),
        "hot_count": sum(bool(row["hot_items"]) for row in rows),
    }


@login_required
def kitchen_live(request):
    context = build_kitchen_context(request.GET.get("filter"))
    return JsonResponse({
        "html": render_to_string("orders/_kitchen_board.html", context, request=request)
    })


@login_required
@require_POST
def update_bar_status(request, order_id):
    """Update the status of a specific bar (cold or hot) for an order."""
    try:
        data = json.loads(request.body)
        bar = data.get("bar")  # "cold" or "hot"
        status = data.get("status")  # "pending" or "completed"
        
        if bar not in ["cold", "hot"]:
            return JsonResponse({"success": False, "error": "Barra no válida"}, status=400)
        
        if status not in Order.BarStatus.values:
            return JsonResponse({"success": False, "error": "Estado no válido"}, status=400)
        
        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), id=order_id)
            station_items = order.items.filter(preparation_station_snapshot=bar)
            if not station_items.exists():
                return JsonResponse(
                    {"success": False, "error": "Esta orden no tiene productos para esa barra."},
                    status=400,
                )
            
            if bar == "cold":
                order.cold_bar_status = status
            else:
                order.hot_bar_status = status

            order.save(update_fields=["cold_bar_status", "hot_bar_status", "updated_at"])
            station_items.update(preparation_status=status)
            
            # Update overall status based on bar statuses
            order.update_overall_status()
        
        return JsonResponse({
            "success": True,
            "cold_bar_status": order.get_cold_bar_status_display(),
            "hot_bar_status": order.get_hot_bar_status_display(),
            "overall_status": order.get_status_display(),
        })
    
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "error": "Datos inválidos"}, status=400)
    except Exception:
        return JsonResponse({"success": False, "error": "No fue posible actualizar la barra."}, status=500)


@administrator_required
def customer_list(request):
    search = request.GET.get("q", "").strip()
    customers = DeliveryCustomer.objects.all()
    if search:
        customers = customers.filter(
            Q(name__icontains=search)
            | Q(phone__icontains=search)
            | Q(street__icontains=search)
            | Q(neighborhood__icontains=search)
        )
    page = Paginator(customers.order_by("name"), 24).get_page(request.GET.get("page"))
    return render(request, "orders/customer_list.html", {"page": page, "search": search})


@administrator_required
def customer_form(request, customer_id=None):
    customer = get_object_or_404(DeliveryCustomer, id=customer_id) if customer_id else None
    form = DeliveryCustomerForm(request.POST or None, instance=customer)
    if request.method == "POST" and form.is_valid():
        saved_customer = form.save()
        messages.success(request, f"El registro de {saved_customer.name} fue guardado.")
        return redirect("orders:customer_list")
    return render(
        request,
        "orders/customer_form.html",
        {"form": form, "customer": customer},
    )


@administrator_required
def customer_delete(request, customer_id):
    customer = get_object_or_404(DeliveryCustomer, id=customer_id)
    if request.method == "POST":
        name = customer.name
        customer.delete()
        messages.success(request, f"El registro de {name} fue eliminado.")
        return redirect("orders:customer_list")
    return render(request, "orders/customer_confirm_delete.html", {"customer": customer})


@administrator_required
def reconciliation_report(request):
    selected_date = parse_date(request.GET.get("date", "")) or timezone.localdate()
    reconciliation, _ = DailyReconciliation.objects.get_or_create(operating_date=selected_date)

    reconciliation_form = DailyReconciliationForm(instance=reconciliation)
    expense_form = ExpenseForm(initial={"operating_date": selected_date})
    form_type = request.POST.get("form_type")
    if request.method == "POST" and form_type == "reconciliation":
        reconciliation_form = DailyReconciliationForm(request.POST, instance=reconciliation)
        if reconciliation_form.is_valid():
            saved = reconciliation_form.save(commit=False)
            saved.operating_date = selected_date
            saved.updated_by = request.user
            saved.save()
            messages.success(request, "La apertura y el cierre fueron guardados.")
            return redirect(f"{reverse('orders:reconciliation')}?date={selected_date.isoformat()}")
    elif request.method == "POST" and form_type == "expense":
        expense_form = ExpenseForm(request.POST)
        if expense_form.is_valid():
            expense = expense_form.save(commit=False)
            expense.operating_date = selected_date
            expense.created_by = request.user
            expense.save()
            messages.success(request, "El gasto fue registrado.")
            return redirect(f"{reverse('orders:reconciliation')}?date={selected_date.isoformat()}")

    completed_orders = Order.objects.filter(
        operating_date=selected_date,
        status=Order.Status.COMPLETED,
    )
    expenses = Expense.objects.filter(operating_date=selected_date).select_related("created_by")
    zero = Decimal("0.00")
    money_field = DecimalField(max_digits=14, decimal_places=2)

    def order_totals(method):
        return completed_orders.filter(payment_method=method).aggregate(
            sales=Coalesce(Sum("total"), zero, output_field=money_field),
            tips=Coalesce(Sum("tip_amount"), zero, output_field=money_field),
        )

    def expense_total(method):
        return expenses.filter(payment_method=method).aggregate(
            total=Coalesce(Sum("amount"), zero, output_field=money_field)
        )["total"]

    cash = order_totals(Order.PaymentMethod.CASH)
    card = order_totals(Order.PaymentMethod.CARD)
    transfer = order_totals(Order.PaymentMethod.TRANSFER)
    cash_expenses = expense_total(Expense.PaymentMethod.CASH)
    card_expenses = expense_total(Expense.PaymentMethod.CARD)
    transfer_expenses = expense_total(Expense.PaymentMethod.TRANSFER)
    total_sales = cash["sales"] + card["sales"] + transfer["sales"]
    total_tips = cash["tips"] + card["tips"] + transfer["tips"]
    total_expenses = cash_expenses + card_expenses + transfer_expenses
    expected = {
        "cash": reconciliation.opening_cash + cash["sales"] + cash["tips"] - cash_expenses,
        "card": card["sales"] + card["tips"] - card_expenses,
        "transfer": transfer["sales"] + transfer["tips"] - transfer_expenses,
    }
    declared = {
        "cash": reconciliation.closing_cash,
        "card": reconciliation.closing_card,
        "transfer": reconciliation.closing_transfer,
    }
    differences = {
        key: (declared[key] - expected[key]) if declared[key] is not None else None
        for key in expected
    }
    return render(request, "orders/reconciliation_report.html", {
        "selected_date": selected_date,
        "reconciliation": reconciliation,
        "reconciliation_form": reconciliation_form,
        "expense_form": expense_form,
        "expenses": expenses,
        "cash": cash, "card": card, "transfer": transfer,
        "cash_expenses": cash_expenses, "card_expenses": card_expenses,
        "transfer_expenses": transfer_expenses,
        "total_sales": total_sales, "total_tips": total_tips,
        "total_expenses": total_expenses, "net_profit": total_sales - total_expenses,
        "expected": expected, "differences": differences,
    })


@administrator_required
@require_POST
def expense_delete(request, expense_id):
    expense = get_object_or_404(Expense, id=expense_id)
    selected_date = expense.operating_date
    expense.delete()
    messages.success(request, "El gasto fue eliminado.")
    return redirect(f"{reverse('orders:reconciliation')}?date={selected_date.isoformat()}")


@administrator_required
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
    tip_summary = completed_orders.aggregate(
        electronic_tips=Coalesce(
            Sum("tip_amount", filter=Q(payment_method__in=[Order.PaymentMethod.CARD, Order.PaymentMethod.TRANSFER])),
            Decimal("0.00"), output_field=money_field,
        ),
        cash_tips=Coalesce(
            Sum("tip_amount", filter=Q(payment_method=Order.PaymentMethod.CASH)),
            Decimal("0.00"), output_field=money_field,
        ),
        total_tips=Coalesce(Sum("tip_amount"), Decimal("0.00"), output_field=money_field),
    )

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

    best_selling_products = list(
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
    maximum_units = max((item["units_sold"] for item in best_selling_products), default=0)
    for rank, product in enumerate(best_selling_products, start=1):
        product["rank"] = rank
        product["bar_width"] = round(product["units_sold"] / maximum_units * 100, 2) if maximum_units else 0

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
            "tip_summary": tip_summary,
            "sales_by_type": sales_by_type,
            "best_selling_products": best_selling_products,
            "page": page,
            "filter_query": query_params.urlencode(),
        },
    )
