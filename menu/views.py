from django.contrib.auth.decorators import login_required
from django.db.models import Prefetch
from django.shortcuts import render

from .models import Category, Product


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