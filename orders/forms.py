from django import forms

from .models import Order


class OrderCreateForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = [
            "order_type",
            "customer_name",
            "phone",
            "table_reference",
            "street",
            "exterior_number",
            "interior_number",
            "neighborhood",
            "notes",
        ]
        labels = {
            "order_type": "Tipo de pedido",
            "customer_name": "Nombre del cliente",
            "phone": "Teléfono",
            "table_reference": "Mesa o referencia",
            "street": "Calle",
            "exterior_number": "Número exterior",
            "interior_number": "Número interior",
            "neighborhood": "Colonia",
            "notes": "Notas adicionales",
        }

    def clean(self):
        cleaned_data = super().clean()
        order_type = cleaned_data.get("order_type")

        if order_type == Order.OrderType.DELIVERY:
            if not cleaned_data.get("customer_name"):
                self.add_error(
                    "customer_name",
                    "El nombre es obligatorio para entregas.",
                )

            if not cleaned_data.get("neighborhood"):
                self.add_error(
                    "neighborhood",
                    "La colonia es obligatoria para entregas.",
                )

        return cleaned_data


class OrderFilterForm(forms.Form):
    date = forms.DateField(
        required=False,
        label="Fecha",
        widget=forms.DateInput(attrs={"type": "date"}),
    )
    order_number = forms.IntegerField(
        required=False,
        min_value=1,
        label="Número de pedido",
    )
    customer = forms.CharField(
        required=False,
        label="Cliente",
    )
    status = forms.ChoiceField(
        required=False,
        label="Estado",
        choices=[("", "Todos")] + list(Order.Status.choices),
    )
    order_type = forms.ChoiceField(
        required=False,
        label="Tipo de pedido",
        choices=[("", "Todos")] + list(Order.OrderType.choices),
    )
    employee = forms.CharField(
        required=False,
        label="Empleado",
    )