from django import forms

from .models import Category, Product


class CategoryForm(forms.ModelForm):
    class Meta:
        model = Category
        fields = [
            "name",
            "image",
        ]
        labels = {
            "name": "Nombre",
            "image": "Imagen o icono",
        }


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = [
            "category",
            "name",
            "price",
            "image",
            "description",
            "is_available",
        ]
        labels = {
            "category": "Categoría",
            "name": "Nombre",
            "price": "Precio",
            "image": "Imagen",
            "description": "Descripción",
            "is_available": "Disponible",
        }
        widgets = {
            "description": forms.Textarea(
                attrs={"rows": 3},
            ),
        }