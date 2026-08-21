from django.contrib import admin

from .models import DeliveryCustomer, Order, OrderItem


@admin.register(DeliveryCustomer)
class DeliveryCustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "neighborhood", "updated_at")
    search_fields = ("name", "phone", "street", "neighborhood")
    readonly_fields = ("normalized_name", "created_at", "updated_at")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = (
        "product",
        "product_name_snapshot",
        "unit_price",
        "quantity",
        "subtotal",
    )

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "operating_date",
        "customer_name",
        "order_type",
        "total",
        "status",
        "employee_name_snapshot",
    )
    list_filter = ("operating_date", "order_type", "status")
    search_fields = ("customer_name", "employee_name_snapshot")
    list_editable = ("status",)
    readonly_fields = (
        "daily_number",
        "operating_date",
        "created_by",
        "employee_name_snapshot",
        "total",
        "created_at",
        "updated_at",
    )
    inlines = [OrderItemInline]

    @admin.display(description="Número", ordering="daily_number")
    def order_number(self, obj):
        return f"#{obj.daily_number:03d}"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
