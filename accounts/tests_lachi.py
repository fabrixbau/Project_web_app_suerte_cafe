from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import LachiPhrase, Profile


class LachiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("mesero", password="x")
        self.client.force_login(self.user)

    def test_look_se_guarda_por_usuario_y_devuelve_dibujo(self):
        response = self.client.post(reverse("accounts:lachi_look"), {"look": "peluche"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("lachi-plush", response.json()["html"])
        self.assertEqual(Profile.objects.get(user=self.user).mascot_look, "peluche")
        page = self.client.get(reverse("orders:list"))
        self.assertContains(page, "lachi-look-peluche")

    def test_look_invalido_se_rechaza(self):
        response = self.client.post(reverse("accounts:lachi_look"), {"look": "mickey"})
        self.assertEqual(response.status_code, 400)

    def test_frases_iniciales_y_crud_de_empleado(self):
        self.assertTrue(LachiPhrase.objects.filter(text="Never say never").exists())
        self.client.post(reverse("accounts:lachi_phrases"), {"text": "  Hola   café ", "moment": "poke", "is_active": "on"})
        phrase = LachiPhrase.objects.get(text="Hola café")
        self.assertEqual(phrase.created_by, self.user)
        self.assertContains(self.client.get(reverse("orders:list")), "Hola café")
        prefix = f"phrase-{phrase.id}"
        self.client.post(reverse("accounts:lachi_phrase_edit", args=[phrase.id]), {f"{prefix}-text": "Hola café", f"{prefix}-moment": "poke"})
        phrase.refresh_from_db()
        self.assertFalse(phrase.is_active)
        self.assertNotContains(self.client.get(reverse("orders:list")), "Hola café")
        self.client.post(reverse("accounts:lachi_phrase_delete", args=[phrase.id]))
        self.assertFalse(LachiPhrase.objects.filter(pk=phrase.id).exists())
