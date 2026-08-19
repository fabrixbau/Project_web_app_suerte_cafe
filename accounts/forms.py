from django import forms
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group
from django.db import transaction

from .models import Profile
from .signals import ADMINISTRATOR_GROUP, REGULAR_USER_GROUP


class EmployeeLoginForm(forms.Form):
    user = forms.ModelChoiceField(
        label="Usuario",
        queryset=get_user_model().objects.filter(
            is_active=True,
        ).order_by("username"),
        empty_label="Selecciona tu usuario",
    )
    password = forms.CharField(
        label="Contraseña",
        required=False,
        widget=forms.PasswordInput,
    )

    def __init__(self, *args, request=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.request = request
        self.authenticated_user = None

    def clean(self):
        cleaned_data = super().clean()
        selected_user = cleaned_data.get("user")
        password = cleaned_data.get("password", "")

        if not selected_user:
            return cleaned_data

        is_administrator = (
            selected_user.is_superuser
            or selected_user.groups.filter(
                name=ADMINISTRATOR_GROUP,
            ).exists()
        )
        requires_password = (
            is_administrator or selected_user.has_usable_password()
        )

        if requires_password:
            if not password:
                raise forms.ValidationError(
                    "Este usuario necesita contraseña.",
                )

            authenticated_user = authenticate(
                self.request,
                username=selected_user.username,
                password=password,
            )

            if authenticated_user is None:
                raise forms.ValidationError("La contraseña es incorrecta.")

            self.authenticated_user = authenticated_user
        else:
            self.authenticated_user = selected_user

        return cleaned_data

    def get_user(self):
        return self.authenticated_user


class SignUpForm(forms.ModelForm):
    first_name = forms.CharField(label="Nombre", max_length=150)
    last_name = forms.CharField(label="Apellidos", max_length=150)
    email = forms.EmailField(label="Correo electrónico")
    image = forms.ImageField(label="Foto de perfil", required=False)
    password = forms.CharField(
        label="Contraseña (opcional)",
        required=False,
        widget=forms.PasswordInput,
    )
    password_confirm = forms.CharField(
        label="Confirmar contraseña",
        required=False,
        widget=forms.PasswordInput,
    )

    class Meta:
        model = get_user_model()
        fields = (
            "username",
            "first_name",
            "last_name",
            "email",
            "image",
            "password",
            "password_confirm",
        )
        labels = {
            "username": "Nombre visible",
        }

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()

        if get_user_model().objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Este correo ya está registrado.")

        return email

    def clean(self):
        cleaned_data = super().clean()

        if cleaned_data.get("password") != cleaned_data.get("password_confirm"):
            self.add_error(
                "password_confirm",
                "Las contraseñas no coinciden.",
            )

        return cleaned_data

    @transaction.atomic
    def save(self, commit=True):
        user = super().save(commit=False)
        password = self.cleaned_data.get("password")

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        if commit:
            user.save()
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.image = self.cleaned_data.get("image")
            profile.save()

            regular_group, _ = Group.objects.get_or_create(
                name=REGULAR_USER_GROUP,
            )
            user.groups.add(regular_group)

        return user


class ProfileEditForm(forms.ModelForm):
    username = forms.CharField(label="Nombre visible", max_length=150)
    first_name = forms.CharField(label="Nombre", max_length=150)
    last_name = forms.CharField(label="Apellidos", max_length=150)
    email = forms.EmailField(label="Correo electrónico")

    class Meta:
        model = Profile
        fields = ("image",)
        labels = {
            "image": "Foto de perfil",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.instance.user
        self.fields["username"].initial = user.username
        self.fields["first_name"].initial = user.first_name
        self.fields["last_name"].initial = user.last_name
        self.fields["email"].initial = user.email

    def clean_username(self):
        username = self.cleaned_data["username"].strip()
        duplicate = get_user_model().objects.filter(
            username__iexact=username,
        ).exclude(id=self.instance.user_id)

        if duplicate.exists():
            raise forms.ValidationError("Este nombre visible ya existe.")

        return username

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        duplicate = get_user_model().objects.filter(
            email__iexact=email,
        ).exclude(id=self.instance.user_id)

        if duplicate.exists():
            raise forms.ValidationError("Este correo ya está registrado.")

        return email

    @transaction.atomic
    def save(self, commit=True):
        profile = super().save(commit=False)
        user = profile.user
        user.username = self.cleaned_data["username"]
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        user.email = self.cleaned_data["email"]

        if commit:
            user.save(
                update_fields=[
                    "username",
                    "first_name",
                    "last_name",
                    "email",
                ]
            )
            profile.save()

        return profile
