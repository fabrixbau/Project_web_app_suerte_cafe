from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from datetime import timedelta
from decimal import Decimal

from django.core.paginator import Paginator
from django.db.models import Avg, Count, DecimalField, IntegerField, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from menu.models import Product

from .forms import OrderCreateForm, OrderFilterForm, SalesReportFilterForm
from .models import Order, OrderItem
from .services import create_order, update_order


@login_required
def order_detail(request, order_id):
    order = get_object_or_404(
        Order.objects.select_related(
            "created_by",
        ).prefetch_related(
            "items__product",
        ),
        id=order_id,
    )


    return render(
        request,
        "orders/order_detail.html",
        {"order": order},
    )


@login_required
def order_edit(request, order_id):
    order = get_object_or_404(
        Order.objects.prefetch_related("items__product"),
        id=order_id,
    )

    current_items = list(order.items.all())
    existing_product_ids = {
        item.product_id for item in current_items if item.product_id
    }
    products = list(
        Product.objects.filter(is_available=True)
        .exclude(id__in=existing_product_ids)
        .select_related("category")
        .order_by("category__name", "name")
    )
    form = OrderCreateForm(request.POST or None, instance=order)

    if request.method == "POST":
        form_is_valid = form.is_valid()
        item_quantities = {}
        new_items = []

        for item in current_items:
            raw_quantity = request.POST.get(
                f"item_quantity_{item.id}", str(item.quantity)
            )
            try:
                quantity = int(raw_quantity)
            except (TypeError, ValueError):
                quantity = item.quantity
                form.add_error(
                    None,
                    f"Cantidad inválida para {item.product_name_snapshot}.",
                )
            if quantity < 0:
                quantity = 0
                form.add_error(
                    None,
                    f"La cantidad de {item.product_name_snapshot} no puede ser negativa.",
                )
            item.selected_quantity = quantity
            item_quantities[item.id] = quantity

        for product in products:
            raw_quantity = request.POST.get(f"product_quantity_{product.id}", "0")
            try:
                quantity = int(raw_quantity)
            except (TypeError, ValueError):
                quantity = 0
                form.add_error(None, f"Cantidad inválida para {product.name}.")
            if quantity < 0:
                quantity = 0
                form.add_error(
                    None,
                    f"La cantidad de {product.name} no puede ser negativa.",
                )
            product.selected_quantity = quantity
            if quantity > 0:
                new_items.append(
                    {"product_id": product.id, "quantity": quantity}
                )

        if form_is_valid and not form.errors:
            customer_data = form.cleaned_data.copy()
            order_type = customer_data.pop("order_type")
            try:
                order = update_order(
                    order=order,
                    order_type=order_type,
                    item_quantities=item_quantities,
                    new_items=new_items,
                    customer_data=customer_data,
                )
            except ValidationError as error:
                for message in error.messages:
                    form.add_error(None, message)
            else:
                messages.success(
                    request,
                    f"El pedido {order.formatted_number} fue editado.",
                )
                return redirect("orders:detail", order_id=order.id)
    else:
        for item in current_items:
            item.selected_quantity = item.quantity
        for product in products:
            product.selected_quantity = 0

    return render(
        request,
        "orders/order_edit.html",
        {
            "order": order,
            "form": form,
            "current_items": current_items,
            "products": products,
        },
    )

@login_required
@require_POST
def order_status_update(request, order_id):
    order = get_object_or_404(Order, id=order_id)
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
        messages.error(request, "El estado seleccionado no es válido.")
    else:
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])

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
def order_create(request):
    products = Product.objects.filter(
        is_available=True,
    ).select_related("category").order_by(
        "category__name",
        "name",
    )

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
                quantity = int(raw_quantity)
            except ValueError:
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

        if not items:
            form.add_error(
                None,
                "Selecciona al menos un producto.",
            )

        if form_is_valid and not form.errors:
            customer_data = form.cleaned_data.copy()
            order_type = customer_data.pop("order_type")

            try:
                order = create_order(
                    user=request.user,
                    order_type=order_type,
                    items=items,
                    customer_data=customer_data,
                )
            except ValidationError as error:
                for message in error.messages:
                    form.add_error(None, message)
            else:
                messages.success(
                    request,
                    f"Pedido #{order.daily_number:03d} guardado.",
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
