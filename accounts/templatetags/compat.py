from django import template
from django.templatetags.static import static


register = template.Library()


@register.simple_tag(takes_context=True)
def compatible_js(context, filename):
    folder = "js/legacy" if context.get("legacy_ios9") else "js"
    return static(f"{folder}/{filename}")
