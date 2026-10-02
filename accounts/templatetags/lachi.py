from django import template

from accounts.models import LachiPhrase, Profile


register = template.Library()


@register.simple_tag
def lachi_look(user):
    """Look de Lachi del usuario (Tierno si todavía no tiene perfil)."""
    profile = getattr(user, "profile", None) if user.is_authenticated else None
    look = getattr(profile, "mascot_look", "") or Profile.MascotLook.TIERNO
    return look if look in Profile.MascotLook.values else Profile.MascotLook.TIERNO


@register.simple_tag
def lachi_phrases():
    """Frases activas agrupadas por momento: {"poke": [...], "completed": [...], ...}."""
    phrases = {}
    for moment, text in LachiPhrase.objects.filter(is_active=True).values_list("moment", "text"):
        phrases.setdefault(moment, []).append(text)
    return phrases
