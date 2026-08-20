import unicodedata

from django import template


register = template.Library()


@register.filter
def category_fallback(category_name):
    normalized = unicodedata.normalize("NFKD", category_name or "")
    normalized = "".join(
        character for character in normalized if not unicodedata.combining(character)
    ).casefold()

    images = {
        "alimentos": "img/ui/categories/alimentos.jpg",
        "bebidas calientes": "img/ui/categories/bebidas-calientes.jpg",
        "bebidas frias": "img/ui/categories/bebidas-frias.jpg",
        "postres": "img/ui/categories/postres.jpg",
    }
    return images.get(normalized, "img/ui/placeholders/category.svg")


@register.filter
def category_icon(category_name):
    normalized = unicodedata.normalize("NFKD", category_name or "")
    normalized = "".join(
        character for character in normalized if not unicodedata.combining(character)
    ).casefold()
    icons = {
        "alimentos": "🍽️",
        "bebidas calientes": "☕",
        "bebidas frias": "🧊",
        "birria": "🥣",
        "postres": "🍰",
    }
    return icons.get(normalized, "◆")
