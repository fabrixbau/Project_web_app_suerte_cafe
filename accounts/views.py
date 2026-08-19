from django.contrib import messages
from django.contrib.auth import (
    get_user_model,
    login,
    update_session_auth_hash,
)
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib.auth.forms import PasswordChangeForm, SetPasswordForm
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.http import url_has_allowed_host_and_scheme

from .forms import EmployeeLoginForm, ProfileEditForm, SignUpForm
from .models import Profile


@login_required
def home(request):
    return render(request, "home.html")


def login_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    form = EmployeeLoginForm(
        request.POST or None,
        request=request,
    )

    if request.method == "POST" and form.is_valid():
        user = form.get_user()
        login(
            request,
            user,
            backend="django.contrib.auth.backends.ModelBackend",
        )

        next_url = request.POST.get("next")
        if next_url and url_has_allowed_host_and_scheme(
            next_url,
            allowed_hosts={request.get_host()},
        ):
            return redirect(next_url)

        return redirect("home")

    return render(
        request,
        "registration/login.html",
        {"form": form, "next": request.GET.get("next", "")},
    )


def signup(request):
    if request.user.is_authenticated:
        return redirect("home")

    form = SignUpForm(
        request.POST or None,
        request.FILES or None,
    )

    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user)
        messages.success(request, "Tu cuenta fue creada correctamente.")
        return redirect("home")

    return render(
        request,
        "accounts/signup.html",
        {"form": form},
    )


@login_required
def profile_edit(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    form = ProfileEditForm(
        request.POST or None,
        request.FILES or None,
        instance=profile,
    )

    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Tu perfil fue actualizado.")
        return redirect("accounts:profile_edit")

    return render(
        request,
        "accounts/profile_form.html",
        {"form": form},
    )


@login_required
def password_change(request):
    form_class = (
        PasswordChangeForm
        if request.user.has_usable_password()
        else SetPasswordForm
    )
    form = form_class(
        user=request.user,
        data=request.POST or None,
    )

    if request.method == "POST" and form.is_valid():
        user = form.save()
        update_session_auth_hash(request, user)
        messages.success(request, "Tu contraseña fue actualizada.")
        return redirect("accounts:profile_edit")

    return render(
        request,
        "accounts/password_change_form.html",
        {"form": form},
    )


@login_required
@permission_required("auth.view_user", raise_exception=True)
def user_list(request):
    users = get_user_model().objects.select_related(
        "profile",
    ).prefetch_related(
        "groups",
    ).order_by("username")

    return render(
        request,
        "accounts/user_list.html",
        {"users": users},
    )


@login_required
@permission_required("auth.delete_user", raise_exception=True)
def user_delete(request, user_id):
    target_user = get_object_or_404(get_user_model(), id=user_id)

    if target_user == request.user:
        messages.error(request, "No puedes eliminar tu propia cuenta.")
        return redirect("accounts:user_list")

    if target_user.is_superuser and not request.user.is_superuser:
        raise PermissionDenied

    if request.method == "POST":
        username = target_user.username
        target_user.delete()
        messages.success(request, f"El usuario {username} fue eliminado.")
        return redirect("accounts:user_list")

    return render(
        request,
        "accounts/user_confirm_delete.html",
        {"target_user": target_user},
    )
