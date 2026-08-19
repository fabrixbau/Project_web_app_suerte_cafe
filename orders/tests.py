from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from menu.models import Category, Product

from .models import Order
from .services import create_order
from django.urls import reverse


class CreateOrderTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="empleado",
            password="clave-segura-123",
        )

        self.category = Category.objects.create(
            name="Bebidas calientes",
        )

        self.product = Product.objects.create(
            category=self.category,
            name="Capuchino",
            price=Decimal("30.00"),
            is_available=True,
        )

    def test_creates_order_with_correct_total(self):
        order = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[
                {
                    "product_id": self.product.id,
                    "quantity": 2,
                }
            ],
        )

        item = order.items.get()

        self.assertEqual(order.total, Decimal("60.00"))
        self.assertEqual(item.product_name_snapshot, "Capuchino")
        self.assertEqual(item.unit_price, Decimal("30.00"))
        self.assertEqual(item.subtotal, Decimal("60.00"))

    def test_daily_numbers_increment(self):
        first_order = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[
                {
                    "product_id": self.product.id,
                    "quantity": 1,
                }
            ],
        )

        second_order = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[
                {
                    "product_id": self.product.id,
                    "quantity": 1,
                }
            ],
        )

        self.assertEqual(first_order.daily_number, 1)
        self.assertEqual(second_order.daily_number, 2)

    def test_rejects_empty_order(self):
        with self.assertRaises(ValidationError):
            create_order(
                user=self.user,
                order_type=Order.OrderType.PICKUP,
                items=[],
            )

    def test_rejects_unavailable_product(self):
        self.product.is_available = False
        self.product.save(update_fields=["is_available"])

        with self.assertRaises(ValidationError):
            create_order(
                user=self.user,
                order_type=Order.OrderType.PICKUP,
                items=[
                    {
                        "product_id": self.product.id,
                        "quantity": 1,
                    }
                ],
            )
    def test_authenticated_user_can_update_status(self):
        order = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[
                {
                    "product_id": self.product.id,
                    "quantity": 1,
                }
            ],
        )

        self.client.force_login(self.user)

        response = self.client.post(
            reverse(
                "orders:status_update",
                args=[order.id],
            ),
            {
                "status": Order.Status.COMPLETED,
            },
        )

        order.refresh_from_db()

        self.assertRedirects(response, reverse("orders:list"))
        self.assertEqual(order.status, Order.Status.COMPLETED)
        self.assertEqual(order.formatted_number, "#001")