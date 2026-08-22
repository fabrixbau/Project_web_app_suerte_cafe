from django.contrib import admin
from .models import BusinessSettings, Category, PackagingType, Product, ProductOption, ProductOptionGroup


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "is_available")
    list_filter = ("category", "is_available")
    search_fields = ("name", "description")
    list_editable = ("is_available",)


admin.site.register(ProductOptionGroup)
admin.site.register(ProductOption)
admin.site.register(BusinessSettings)
admin.site.register(PackagingType)
