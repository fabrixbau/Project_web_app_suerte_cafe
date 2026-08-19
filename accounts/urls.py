from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("signup/", views.signup, name="signup"),
    path("profile/", views.profile_edit, name="profile_edit"),
    path(
        "password/change/",
        views.password_change,
        name="password_change",
    ),
    path("users/", views.user_list, name="user_list"),
    path(
        "users/<int:user_id>/delete/",
        views.user_delete,
        name="user_delete",
    ),
]
