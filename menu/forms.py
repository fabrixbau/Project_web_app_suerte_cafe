from django import forms

from config.images import optimize_uploaded_image

from .models import BusinessSettings, Category, PackagingType, Product
from .widgets import ProductImageInput


class BusinessSettingsForm(forms.ModelForm):
    class Meta:
        model = BusinessSettings
        fields = ("automatic_packaging_fee",)
        labels = {
            "automatic_packaging_fee": "Agregar cargo automáticamente",
        }


class PackagingTypeForm(forms.ModelForm):
    class Meta:
        model = PackagingType
        fields = ("name", "price", "is_active", "sort_order")
        labels = {
            "name": "Nombre del envase",
            "price": "Precio unitario",
            "is_active": "Disponible",
            "sort_order": "Orden visual",
        }
        widgets = {
            "name": forms.TextInput(attrs={"placeholder": "Ej. Envase de comida o vaso"}),
            "price": forms.NumberInput(attrs={"min": "0", "step": "0.50"}),
        }


class CategoryForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_packaging_type_id = self.instance.default_packaging_type_id

    class Meta:
        model = Category
        fields = [
            "name",
            "preparation_station",
            "default_packaging_type",
        ]
        labels = {
            "name": "Nombre",
            "preparation_station": "Barra de preparación",
            "default_packaging_type": "Envase automático de la categoría",
        }

    def clean_name(self):
        name = " ".join(self.cleaned_data["name"].split())
        duplicate = Category.objects.filter(name__iexact=name).exclude(
            pk=self.instance.pk
        )
        if duplicate.exists():
            raise forms.ValidationError("Ya existe una categoría con este nombre.")
        return name

    def save(self, commit=True):
        category = super().save(commit=commit)
        if (
            commit
            and category.default_packaging_type_id
            and category.default_packaging_type_id != self._original_packaging_type_id
        ):
            category.products.update(packaging_type=None)
        return category


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = [
            "category",
            "name",
            "price",
            "image",
            "image_position_x",
            "image_position_y",
            "image_zoom",
            "description",
            "is_available",
            "preparation_station",
            "packaging_type",
        ]
        labels = {
            "category": "Categoría",
            "name": "Nombre",
            "price": "Precio",
            "image": "Imagen",
            "description": "Descripción",
            "is_available": "Disponible",
            "preparation_station": "Barra de preparación (opcional)",
            "packaging_type": "Envase específico (opcional)",
        }
        widgets = {
            "description": forms.Textarea(
                attrs={"rows": 3},
            ),
            "image": ProductImageInput(attrs={"accept": "image/*"}),
            "image_position_x": forms.HiddenInput(),
            "image_position_y": forms.HiddenInput(),
            "image_zoom": forms.HiddenInput(),
        }

    def clean_image(self):
        return optimize_uploaded_image(
            self.cleaned_data.get("image"),
            max_dimension=1200,
        )

    def clean_name(self):
        name = " ".join(self.cleaned_data["name"].split())
        if name:
            name = name[0].upper() + name[1:]
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


