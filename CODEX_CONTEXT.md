# CODEX CONTEXT - Suerte Café

> Documento de contexto para el proyecto Suerte Café
> Este archivo contiene toda la información relevante sobre el proyecto para que cualquier IA pueda continuar el trabajo fácilmente.

---

## 1. Información General del Proyecto

**Nombre del proyecto**: Suerte Café
**Tipo**: Sistema de gestión para cafetería
**Tecnologías**: Django, PostgreSQL, HTML/CSS/JavaScript
**Ubicación**: `D:\github\work_space_shared\project_app_web_suerte_cafe\Project_web_app_suerte_cafe`

### Propósito
Sistema web para administrar la operación de una cafetería que tiene dividida la cocina en dos barras:
- **Barra fría**: Bebidas (frías, calientes, sodas, etc.)
- **Barra caliente**: Comida (hot dogs, waffles, postres, sandwiches, etc.)

---

## 2. Estructura del Proyecto

```
Project_web_app_suerte_cafe/
├── accounts/          # Sistema de usuarios y perfiles
├── config/            # Configuración de Django
├── menu/              # Gestión de productos, categorías y opciones
├── orders/            # Gestión de pedidos y comandas
├── profiles/          # Perfiles de usuario
├── static/            # Archivos estáticos (CSS, JS, imágenes)
├── templates/         # Plantillas base
├── media/             # Archivos multimedia
├── manage.py          # Script de gestión de Django
├── requirements.txt   # Dependencias del proyecto
└── .env              # Variables de entorno
```

---

## 3. Modelos de Datos Principales

### 3.1 Order (orders/models.py)
```python
class Order(models.Model):
    # Campos principales
    daily_number = models.PositiveIntegerField()  # Número de pedido del día
    operating_date = models.DateField()           # Fecha de operación
    created_by = models.ForeignKey(User)          # Usuario que creó el pedido
    employee_name_snapshot = models.CharField()   # Snapshot del nombre del empleado
    
    # Tipo y estado del pedido
    order_type = models.CharField(choices=OrderType.choices)  # EAT_IN, DELIVERY, PICKUP
    status = models.CharField(choices=Status.choices)         # IN_PROGRESS, COMPLETED, CANCELED
    
    # Estados independientes de barras (NUEVA FUNCIONALIDAD)
    cold_bar_status = models.CharField(choices=BarStatus.choices)  # PENDING, COMPLETED
    hot_bar_status = models.CharField(choices=BarStatus.choices)  # PENDING, COMPLETED
    
    # Información del cliente
    customer_name = models.CharField()
    phone = models.CharField()
    table_reference = models.CharField()
    
    # Información de entrega
    street = models.CharField()
    exterior_number = models.CharField()
    interior_number = models.CharField()
    neighborhood = models.CharField()
    notes = models.TextField()
    
    # Información financiera
    total = models.DecimalField()
    packaging_fee = models.DecimalField()
    payment_method = models.CharField(choices=PaymentMethod.choices)  # CASH, CARD, TRANSFER
    cash_received = models.DecimalField()
    tip_amount = models.DecimalField()
    
    # Métodos importantes
    def update_overall_status(self):
        """Actualiza el estado general basado en los estados de las barras"""
        if self.cold_bar_status == self.BarStatus.COMPLETED and self.hot_bar_status == self.BarStatus.COMPLETED:
            self.status = self.Status.COMPLETED
```

### 3.2 OrderItem (orders/models.py)
```python
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items")
    product = models.ForeignKey(Product)
    
    # Snapshots para preservar información
    product_name_snapshot = models.CharField()
    preparation_station_snapshot = models.CharField()  # COLD, HOT
    preparation_status = models.CharField()  # PENDING, COMPLETED
    
    # Información de producto
    unit_price = models.DecimalField()
    base_unit_price = models.DecimalField()
    configuration_snapshot = models.JSONField()
    configuration_signature = models.CharField()
    is_customized = models.BooleanField()
    quantity = models.PositiveIntegerField()
    subtotal = models.DecimalField()
```

### 3.3 Category (menu/models.py)
```python
class Category(models.Model):
    name = models.CharField(unique=True)
    
    # Clasificación de barra (NUEVA FUNCIONALIDAD)
    preparation_station = models.CharField(choices=PreparationStation.choices)
    # COLD = "Barra fría" (bebidas)
    # HOT = "Barra caliente" (comida)
    
    default_packaging_type = models.ForeignKey("PackagingType")
    image = models.ImageField()
```

### 3.4 Product (menu/models.py)
```python
class Product(models.Model):
    category = models.ForeignKey(Category)
    name = models.CharField()
    price = models.DecimalField()
    image = models.ImageField()
    description = models.TextField()
    is_available = models.BooleanField()
    
    # Sobrescritura opcional de la barra
    preparation_station = models.CharField(blank=True)
    # Si está vacío, usa la barra de la categoría
    
    packaging_type = models.ForeignKey("PackagingType")
    
    @property
    def effective_preparation_station(self):
        """Retorna la barra efectiva (producto o categoría)"""
        return self.preparation_station or self.category.preparation_station
```

---

## 4. Nueva Funcionalidad: Vista de Cocina con Filtros de Barras

### 4.1 Propósito
Implementar una vista de cocina que permita a los baristas filtrar pedidos según la barra que operan, con capacidad de marcar el estado de cada barra independientemente.

### 4.2 Características Principales

#### Tres Modos de Filtro
1. **Barra fría**: Muestra solo productos clasificados como "COLD" (bebidas)
2. **Barra caliente**: Muestra solo productos clasificados como "HOT" (comida)
3. **2 players**: Vista dividida en dos columnas mostrando ambas barras simultáneamente

#### Estados Independientes
- Cada pedido tiene `cold_bar_status` y `hot_bar_status` independientes
- El estado general del pedido solo se marca como COMPLETED cuando ambas barras están COMPLETED
- Evita que una barra cierre accidentalmente todo el pedido

#### Diseño de la Interfaz
- **Prioridad visual**: Producto, cantidad, personalizaciones, notas, tipo de pedido
- **Información secundaria**: Nombre del cliente, mesa, total
- **Botones grandes**: Filtros principales fáciles de usar en ambiente de cocina
- **Auto-refresco**: Actualización cada 30 segundos
- **Responsive**: Funciona en móviles y tablets

### 4.3 Implementación Técnica

#### Vista Principal (orders/views.py)
```python
@login_required
def kitchen_view(request):
    """Vista de cocina con filtros de barras"""
    filter_mode = request.GET.get("filter", "all")
    
    orders = Order.objects.prefetch_related("items__product").filter(
        operating_date=timezone.localdate(),
        status__in=[Order.Status.IN_PROGRESS, Order.Status.COMPLETED]
    ).order_by("-created_at")
    
    # Separar pedidos por barra
    cold_orders = []
    hot_orders = []
    
    for order in orders:
        cold_items = [item for item in order.items.all() 
                     if item.preparation_station_snapshot == Category.PreparationStation.COLD]
        hot_items = [item for item in order.items.all() 
                    if item.preparation_station_snapshot == Category.PreparationStation.HOT]
        
        if cold_items:
            cold_orders.append({"order": order, "items": cold_items, "bar_status": order.cold_bar_status})
        if hot_items:
            hot_orders.append({"order": order, "items": hot_items, "bar_status": order.hot_bar_status})
    
    return render(request, "orders/kitchen_view.html", context)
```

#### API de Actualización de Estado (orders/views.py)
```python
@login_required
@require_POST
def update_bar_status(request, order_id):
    """Actualiza el estado de una barra específica"""
    data = json.loads(request.body)
    bar = data.get("bar")  # "cold" o "hot"
    status = data.get("status")  # "pending" o "completed"
    
    with transaction.atomic():
        order = get_object_or_404(Order.objects.select_for_update(), id=order_id)
        
        if bar == "cold":
            order.cold_bar_status = status
        else:
            order.hot_bar_status = status
        
        order.save(update_fields=["cold_bar_status", "hot_bar_status", "updated_at"])
        order.update_overall_status()  # Actualiza estado general
    
    return JsonResponse({"success": True, ...})
```

#### URL Routing (orders/urls.py)
```python
urlpatterns = [
    # ... otras rutas ...
    path("kitchen/", views.kitchen_view, name="kitchen"),
    path("<int:order_id>/update-bar-status/", views.update_bar_status, name="update_bar_status"),
]
```

### 4.4 Plantilla (orders/templates/orders/kitchen_view.html)
- Diseño responsive con grid layout
- Tres modos de visualización (single bar, two players, all orders)
- JavaScript para manejar actualizaciones de estado y auto-refresco
- Estilos CSS integrados para apariencia de cocina

### 4.5 Configuración de Categorías
Las categorías existentes fueron asignadas así:
- **Bebidas calientes** → Barra fría (COLD)
- **Bebidas frías** → Barra fría (COLD)
- **Alimentos** → Barra caliente (HOT)
- **Birria** → Barra caliente (HOT)
- **Postres** → Barra caliente (HOT)
- **Métodos** → Barra caliente (HOT)

---

## 5. Funcionalidades Existentes

### 5.1 Gestión de Pedidos
- Creación de pedidos con múltiples productos
- Edición de pedidos existentes
- Tres tipos de pedido: Comer aquí, Entrega, Recoger
- Sistema de números de pedido diarios
- Gestión de envases y cobros de empaque
- Propinas y métodos de pago

### 5.2 Gestión de Productos
- Categorías de productos
- Productos con opciones configurables
- Modificadores y precios adicionales
- Control de disponibilidad
- Gestión de imágenes

### 5.3 Usuarios y Permisos
- Sistema de autenticación de Django
- Perfiles de usuario con permisos
- Diferentes roles: administrador, mesero, etc.

### 5.4 Reportes
- Reporte de ventas
- Filtrado por fechas y tipos de pedido
- Estadísticas de productos más vendidos

---

## 6. Comandos Importantes

### Desarrollo
```bash
# Activar entorno virtual
.venv\Scripts\activate

# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Correr servidor de desarrollo
python manage.py runserver

# Verificar sistema
python manage.py check
```

### Accesos Web
- **Panel de cocina**: `http://127.0.0.1:8000/orders/kitchen/`
- **Lista de pedidos**: `http://127.0.0.1:8000/orders/`
- **Nuevo pedido**: `http://127.0.0.1:8000/orders/new/`
- **Reportes**: `http://127.0.0.1:8000/orders/reports/`

---

## 7. Decisiones de Diseño Importantes

### 7.1 Clasificación por Barras
- **No usar nombres de categorías**: La clasificación se basa en el campo `preparation_station` en lugar de nombres de categoría para evitar fallos si cambian los nombres
- **Herencia con sobrescritura**: Los productos heredan la barra de su categoría, pero pueden sobrescribirla individualmente
- **Snapshots**: Los pedidos guardan una copia de la barra al momento de creación para preservar el histórico

### 7.2 Estados Independientes
- **Evitar cierres accidentales**: Cada barra puede marcarse como terminada independientemente
- **Estado general automático**: El pedido solo se marca como completado cuando ambas barras están terminadas
- **Ciclo de estados**: Se mantiene el ciclo de estados existente (IN_PROGRESS → COMPLETED → CANCELED)

### 7.3 Prioridad de Visualización
- **Información crítica**: Producto, cantidad, personalizaciones, tipo de pedido
- **Información secundaria**: Nombre del cliente, mesa, total
- **Diseño táctil**: Botones grandes y fáciles de usar para ambiente de cocina

---

## 8. Próximos Pasos Sugeridos

1. **Pruebas de usuario**: Validar la interfaz con los baristas reales
2. **Optimización de rendimiento**: Mejorar el tiempo de carga de la vista de cocina
3. **Notificaciones en tiempo real**: Implementar WebSockets para actualizaciones instantáneas
4. **Impresión de comandas**: Generar comandas separadas por barra
5. **Métricas de rendimiento**: Medir tiempos de preparación por barra

---

## 9. Notas para Continuar el Desarrollo

- **Versión de Django**: El proyecto usa Django (verificar versión en requirements.txt)
- **Base de datos**: SQLite para desarrollo, PostgreSQL para producción
- **Estilos**: CSS personalizado en static/css/
- **JavaScript**: Vanilla JS, no frameworks
- **Imágenes**: Almacenadas en media/
- **Migraciones**: Siempre aplicar después de cambios en modelos

---

## 10. Contacto y Soporte

Para continuar el desarrollo, cualquier IA debe:
1. Leer este archivo CODEX_CONTEXT.md primero
2. Revisar la estructura del proyecto
3. Entender el sistema de barras fría/caliente
4. Seguir los patrones de código existentes
5. Mantener la documentación actualizada

---

**Última actualización**: 4 de septiembre de 2026
**Versión**: 1.0 - Con funcionalidad de cocina con filtros de barras implementada