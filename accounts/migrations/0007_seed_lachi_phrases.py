from django.db import migrations


# Frases con las que nació Lachi; después se editan desde "Frases de Lachi".
INITIAL_PHRASES = {
    "poke": [
        "¡Hola! Soy Lachi, la mascota de Suerte Café",
        "Tenemos café de la suerte",
        "¡Me haces cosquillas!",
        "¿Ya tomaste tu cafecito hoy?",
        "Un buen café arregla cualquier día",
        "¡Echándole ganas!",
        "Yeah buddy, lightweight baby!",
        "I rose up from the dead, I do it all the time",
        "Never say never",
        "La vida es un gran baile, y el mundo es un salón",
    ],
    "new_order": [
        "¡Llegó un pedido nuevo!",
        "¡Pedido nuevo! A darle con todo",
        "¡Alguien quiere café! Pedido nuevo",
    ],
    "created": [
        "¡Pedido registrado!",
        "¡Uno más! Vamos muy bien",
        "¡Listo! Ya quedó el pedido",
    ],
    "completed": [
        "¡Pedido completado!",
        "¡Excelente trabajo!",
        "¡Otro cliente feliz!",
        "Yeah buddy, lightweight baby!",
    ],
    "canceled": ["Pedido cancelado. ¡Ánimo, seguimos!"],
    "error": [
        "Uy, algo salió mal. Revisa el mensaje",
        "¡Ups! Algo no salió bien",
    ],
    "wake": [
        "¡Ya desperté! ¿Me perdí de algo?",
        "¡Uf! Me quedé dormido un ratito",
        "I rose up from the dead, I do it all the time",
    ],
}


def seed(apps, schema_editor):
    LachiPhrase = apps.get_model("accounts", "LachiPhrase")
    if LachiPhrase.objects.exists():
        return
    LachiPhrase.objects.bulk_create(
        LachiPhrase(text=text, moment=moment)
        for moment, texts in INITIAL_PHRASES.items()
        for text in texts
    )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_lachi_look_and_phrases"),
    ]

    operations = [
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
