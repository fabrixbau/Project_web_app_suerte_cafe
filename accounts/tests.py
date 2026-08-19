from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse

from .signals import ADMINISTRATOR_GROUP, REGULAR_USER_GROUP


class AccountsTests(TestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.regular_user = self.user_model.objects.create_user(
            username="empleado",
            email="empleado@example.com",
            password="clave-segura-123",
        )

    def test_profile_is_created_automatically(self):
        self.assertEqual(self.regular_user.profile.user, self.regular_user)

    def test_signup_creates_regular_user(self):
        response = self.client.post(
            reverse("accounts:signup"),
            {
                "username": "nuevo-empleado",
                "first_name": "Nuevo",
                "last_name": "Empleado",
                "email": "nuevo@example.com",
                "password": "clave-muy-segura-456",
                "password_confirm": "clave-muy-segura-456",
            },
        )

        user = self.user_model.objects.get(username="nuevo-empleado")
        self.assertRedirects(response, reverse("home"))
        self.assertTrue(
            user.groups.filter(name=REGULAR_USER_GROUP).exists()
        )
        self.assertEqual(user.username, "nuevo-empleado")
        self.assertFalse(user.has_perm("menu.add_category"))

    def test_user_can_edit_own_profile(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse("accounts:profile_edit"),
            {
                "first_name": "Ana",
                "last_name": "Pérez",
                "email": "ana@example.com",
                "username": "Anita",
            },
        )

        self.regular_user.refresh_from_db()
        self.regular_user.profile.refresh_from_db()
        self.assertRedirects(response, reverse("accounts:profile_edit"))
        self.assertEqual(self.regular_user.first_name, "Ana")
        self.assertEqual(self.regular_user.username, "Anita")

    def test_user_can_change_password(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse("accounts:password_change"),
            {
                "old_password": "clave-segura-123",
                "new_password1": "otra-clave-segura-789",
                "new_password2": "otra-clave-segura-789",
            },
        )

        self.regular_user.refresh_from_db()
        self.assertRedirects(response, reverse("accounts:profile_edit"))
        self.assertTrue(
            self.regular_user.check_password("otra-clave-segura-789")
        )

    def test_regular_user_cannot_list_employees(self):
        self.client.force_login(self.regular_user)

        response = self.client.get(reverse("accounts:user_list"))

        self.assertEqual(response.status_code, 403)

    def test_administrator_can_list_and_delete_employee(self):
        administrator = self.user_model.objects.create_user(
            username="administrador",
            password="clave-segura-123",
        )
        administrator.groups.add(
            Group.objects.get(name=ADMINISTRATOR_GROUP)
        )
        self.client.force_login(administrator)

        list_response = self.client.get(reverse("accounts:user_list"))
        delete_response = self.client.post(
            reverse(
                "accounts:user_delete",
                args=[self.regular_user.id],
            )
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertRedirects(
            delete_response,
            reverse("accounts:user_list"),
        )
        self.assertFalse(
            self.user_model.objects.filter(id=self.regular_user.id).exists()
        )

    def test_administrator_cannot_delete_self(self):
        administrator = self.user_model.objects.create_user(
            username="administrador",
            password="clave-segura-123",
        )
        administrator.groups.add(
            Group.objects.get(name=ADMINISTRATOR_GROUP)
        )
        self.client.force_login(administrator)

        response = self.client.post(
            reverse("accounts:user_delete", args=[administrator.id])
        )

        self.assertRedirects(response, reverse("accounts:user_list"))
        self.assertTrue(
            self.user_model.objects.filter(id=administrator.id).exists()
        )
