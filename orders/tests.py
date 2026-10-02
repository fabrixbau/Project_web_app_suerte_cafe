from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from menu.models import Category, Product

from .models import DeliveryCustomer, Order
from .services import create_order
from .views import build_kitchen_context


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

    def test_custom_comments_are_preserved_and_grouped_only_when_equal(self):
        order = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[
                {"product_id": self.product.id, "quantity": 1, "option_ids": [], "comment": "Bien caliente"},
                {"product_id": self.product.id, "quantity": 2, "option_ids": [], "comment": "Bien caliente"},
                {"product_id": self.product.id, "quantity": 1, "option_ids": [], "comment": "Sin tapa"},
            ],
        )

        items = list(order.items.order_by("customization_comment"))
        self.assertEqual(len(items), 2)
        self.assertEqual(
            [(item.customization_comment, item.quantity) for item in items],
            [("Bien caliente", 3), ("Sin tapa", 1)],
        )
        self.assertTrue(all(item.is_customized for item in items))

    def test_kitchen_prioritizes_pending_and_sorts_completed_by_closing_time(self):
        now = timezone.now()
        pending_old = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[{"product_id": self.product.id, "quantity": 1}],
        )
        pending_new = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[{"product_id": self.product.id, "quantity": 1}],
        )
        completed_old = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[{"product_id": self.product.id, "quantity": 1}],
        )
        completed_new = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[{"product_id": self.product.id, "quantity": 1}],
        )
        Order.objects.filter(pk=pending_old.pk).update(created_at=now - timedelta(minutes=20))
        Order.objects.filter(pk=pending_new.pk).update(created_at=now - timedelta(minutes=10))
        Order.objects.filter(pk=completed_old.pk).update(
            status=Order.Status.COMPLETED,
            hot_bar_status=Order.BarStatus.COMPLETED,
            hot_bar_completed_at=now - timedelta(minutes=5),
        )
        Order.objects.filter(pk=completed_new.pk).update(
            status=Order.Status.COMPLETED,
            hot_bar_status=Order.BarStatus.COMPLETED,
            hot_bar_completed_at=now - timedelta(minutes=1),
        )

        hot_order_ids = [row["order"].id for row in build_kitchen_context("hot")["hot_rows"]]

        self.assertEqual(
            hot_order_ids,
            [pending_old.id, pending_new.id, completed_old.id, completed_new.id],
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

    def test_order_list_shows_only_today_by_default(self):
        today_order = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[{"product_id": self.product.id, "quantity": 1}],
        )
        previous_order = Order.objects.create(
            daily_number=1,
            operating_date=timezone.localdate() - timedelta(days=1),
            created_by=self.user,
            order_type=Order.OrderType.PICKUP,
        )
        self.client.force_login(self.user)

        response = self.client.get(reverse("orders:list"))
        visible_ids = {
            order.id for order in response.context["page"].object_list
        }

        self.assertIn(today_order.id, visible_ids)
        self.assertNotIn(previous_order.id, visible_ids)

    def test_order_list_accepts_a_date_range(self):
        today = timezone.localdate()
        today_order = create_order(
            user=self.user,
            order_type=Order.OrderType.PICKUP,
            items=[{"product_id": self.product.id, "quantity": 1}],
        )
        previous_order = Order.objects.create(
            daily_number=1,
            operating_date=today - timedelta(days=1),
            created_by=self.user,
            order_type=Order.OrderType.PICKUP,
        )
        self.client.force_login(self.user)

        response = self.client.get(
            reverse("orders:list"),
            {
                "date": today - timedelta(days=1),
                "date_to": today,
            },
        )
        visible_ids = {
            order.id for order in response.context["page"].object_list
        }

        self.assertIn(today_order.id, visible_ids)
        self.assertIn(previous_order.id, visible_ids)


class DeliveryCustomerLookupTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username="admin_clientes",
            password="clave-segura-123",
        )
        self.client.force_login(self.user)
        DeliveryCustomer.objects.create(
            name="María González",
            phone="555 123 4567",
            street="Calle Reforma",
            exterior_number="18",
            neighborhood="Centro",
        )
        DeliveryCustomer.objects.create(name="Mario López", phone="555 987 0000")

    def test_lookup_returns_partial_name_matches(self):
        response = self.client.get(reverse("orders:delivery_customer_lookup"), {"q": "mari"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [customer["name"] for customer in response.json()["matches"]],
            ["María González", "Mario López"],
        )

    def test_lookup_returns_phone_match_and_saved_address(self):
        response = self.client.get(reverse("orders:delivery_customer_lookup"), {"q": "123 45"})

        self.assertEqual(response.status_code, 200)
        match = response.json()["matches"][0]
        self.assertEqual(match["name"], "María González")
        self.assertEqual(match["street"], "Calle Reforma")
        self.assertEqual(match["exterior_number"], "18")
