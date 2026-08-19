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

        return cleaned_data


class OrderFilterForm(forms.Form):
    date = forms.DateField(
        required=False,
        label="Fecha inicial",
        widget=forms.DateInput(attrs={"type": "date"}),
    )
    date_to = forms.DateField(
        required=False,
        label="Fecha final (opcional)",
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

    def clean(self):
        cleaned_data = super().clean()
        date_from = cleaned_data.get("date")
        date_to = cleaned_data.get("date_to")

        if date_from and date_to and date_from > date_to:
            self.add_error(
                "date_to",
                "La fecha final no puede ser anterior a la inicial.",
            )

        return cleaned_data


class SalesReportFilterForm(forms.Form):
    PERIOD_CHOICES = [
        ("today", "Hoy"),
        ("yesterday", "Ayer"),
        ("week", "Esta semana"),
        ("month", "Este mes"),
        ("custom", "Rango personalizado"),
    ]

    period = forms.ChoiceField(
        label="Periodo",
        choices=PERIOD_CHOICES,
        initial="today",
    )
    date_from = forms.DateField(
        required=False,
        label="Fecha inicial",
        widget=forms.DateInput(attrs={"type": "date"}),
    )
    date_to = forms.DateField(
        required=False,
        label="Fecha final",
        widget=forms.DateInput(attrs={"type": "date"}),
    )
    order_type = forms.ChoiceField(
        required=False,
        label="Tipo de pedido",
        choices=[("", "Todos")] + list(Order.OrderType.choices),
    )
    status = forms.ChoiceField(
        required=False,
        label="Estado",
        choices=[("", "Todos")] + list(Order.Status.choices),
    )
    employee = forms.CharField(required=False, label="Empleado")
    customer = forms.CharField(required=False, label="Cliente")
    order_number = forms.IntegerField(
        required=False,
        min_value=1,
        label="Número de pedido",
    )

    def clean(self):
        cleaned_data = super().clean()
        if cleaned_data.get("period") != "custom":
            return cleaned_data

        date_from = cleaned_data.get("date_from")
        date_to = cleaned_data.get("date_to")
        if not date_from or not date_to:
            raise forms.ValidationError(
                "Selecciona la fecha inicial y la fecha final."
            )
        if date_from > date_to:
            self.add_error(
                "date_to",
                "La fecha final no puede ser anterior a la inicial.",
            )
        return cleaned_data
