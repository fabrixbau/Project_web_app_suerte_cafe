from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class MenuPermissionsTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.admin = user_model.objects.create_superuser(
            username="administrador",
            email="admin@example.com",
            password="clave-segura-123",
        )
        self.regular_user = user_model.objects.create_user(
            username="empleado",
            password="clave-segura-123",
        )

    def test_administrator_can_access_menu_configuration(self):
        self.client.force_login(self.admin)

        response = self.client.get(reverse("menu:configuration"))

        self.assertEqual(response.status_code, 200)

    def test_regular_user_cannot_access_menu_configuration(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse("menu:configuration"))

        self.assertEqual(response.status_code, 403)

    def test_regular_user_can_view_available_menu(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse("menu:list"))

        self.assertEqual(response.status_code, 200)

# Create your tests here.
