from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from menu.models import Product

from .forms import OrderCreateForm, OrderFilterForm
from .models import Order
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

    return redirect("orders:list")


@login_required
def order_create(request):
    products = Product.objects.filter(
        is_available=True,
    ).select_related("category").order_by(
        "category__name",
        "name",
    )

    form = OrderCreateForm(request.POST or None)
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
