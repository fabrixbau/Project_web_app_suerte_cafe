from django import forms

from config.images import optimize_uploaded_image

from .models import BusinessSettings, Category, PackagingType, Product, ProductOption, ProductOptionGroup


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
            "packaging_type",
        ]
        labels = {
            "category": "Categoría",
            "name": "Nombre",
            "price": "Precio",
            "image": "Imagen",
            "description": "Descripción",
            "is_available": "Disponible",
            "packaging_type": "Envase predeterminado",
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


class ProductOptionGroupForm(forms.ModelForm):
    class Meta:
        model = ProductOptionGroup
        fields = ("name", "selection_type", "is_required", "sort_order")
        labels = {
            "name": "Nombre del grupo",
            "selection_type": "Tipo de selección",
            "is_required": "Elección obligatoria",
            "sort_order": "Orden visual",
        }
        widgets = {
            "name": forms.TextInput(attrs={"placeholder": "Ej. Salsa, Tamaño o Leche"}),
        }


class ProductOptionGroupCopyForm(forms.Form):
    source_group = forms.ModelChoiceField(
        label="Grupo que deseas pegar",
        queryset=ProductOptionGroup.objects.none(),
        empty_label="Selecciona un grupo existente",
        help_text="Elige el producto y grupo que quieres reutilizar. Se pegarán sus opciones, precios y valores estándar.",
    )

    def __init__(self, *args, target_product, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["source_group"].queryset = (
            ProductOptionGroup.objects.exclude(product=target_product)
            .select_related("product")
            .prefetch_related("options")
            .order_by("product__name", "sort_order", "name")
        )


class ProductOptionForm(forms.ModelForm):
    class Meta:
        model = ProductOption
        fields = ("name", "price_adjustment", "is_default", "is_available", "sort_order")
        labels = {
            "name": "Nombre de la opción",
            "price_adjustment": "Cargo adicional",
            "is_default": "Parte del producto estándar",
            "is_available": "Disponible",
            "sort_order": "Orden visual",
        }
        widgets = {
            "name": forms.TextInput(attrs={"placeholder": "Ej. Verde, Grande o Deslactosada"}),
        }
