from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError


ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


def optimize_uploaded_image(uploaded_file, *, max_dimension):
    """Validate and convert a new upload to a reasonably sized WebP image."""
    if not uploaded_file or not getattr(uploaded_file, "content_type", None):
        return uploaded_file
    if uploaded_file.size > MAX_UPLOAD_SIZE:
        raise ValidationError("La imagen no puede superar 5 MB.")

    try:
        image = Image.open(uploaded_file)
        image.load()
    except (Image.DecompressionBombError, UnidentifiedImageError, OSError, ValueError):
        raise ValidationError("El archivo seleccionado no es una imagen válida.")

    if image.format not in ALLOWED_FORMATS:
        raise ValidationError("Usa una imagen JPG, PNG o WebP.")
    if image.width * image.height > MAX_IMAGE_PIXELS:
        raise ValidationError("La resolución de la imagen es demasiado grande.")

    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA" if "transparency" in image.info else "RGB")

    output = BytesIO()
    image.save(output, format="WEBP", quality=82, method=4)
    output.seek(0)
    filename = f"{Path(uploaded_file.name).stem}.webp"
    return ContentFile(output.read(), name=filename)
