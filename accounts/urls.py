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
    path("lachi/look/", views.lachi_look, name="lachi_look"),
    path("lachi/frases/", views.lachi_phrases, name="lachi_phrases"),
    path("lachi/frases/<int:phrase_id>/", views.lachi_phrase_edit, name="lachi_phrase_edit"),
    path("lachi/frases/<int:phrase_id>/eliminar/", views.lachi_phrase_delete, name="lachi_phrase_delete"),
    path(
        "users/<int:user_id>/schedule/",
        views.user_schedule,
        name="user_schedule",
    ),
    path(
        "users/<int:user_id>/delete/",
        views.user_delete,
        name="user_delete",
    ),
]
