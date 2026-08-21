from django import forms

from config.images import optimize_uploaded_image

from .models import Category, Product


class CategoryForm(forms.ModelForm):
    class Meta:
        model = Category
        fields = [
            "name",
        ]
        labels = {
            "name": "Nombre",
        }

    def clean_name(self):
        name = " ".join(self.cleaned_data["name"].split())
        duplicate = Category.objects.filter(name__iexact=name).exclude(
            pk=self.instance.pk
        )
        if duplicate.exists():
            raise forms.ValidationError("Ya existe una categoría con este nombre.")
        return name


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

    def clean_image(self):
        return optimize_uploaded_image(
            self.cleaned_data.get("image"),
            max_dimension=1200,
        )

    def clean_name(self):
        name = " ".join(self.cleaned_data["name"].split())
        category = self.cleaned_data.get("category")
        if category:
            duplicate = Product.objects.filter(
                category=category,
                name__iexact=name,
            ).exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise forms.ValidationError(
                    "Ya existe un producto con este nombre en la categoría."
                )
        return name
