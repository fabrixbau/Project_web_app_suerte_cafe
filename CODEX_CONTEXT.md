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

    # Encuadre de la fotografía en las tarjetas (NUEVA FUNCIONALIDAD, ver 5.5)
    image_position_x = models.PositiveSmallIntegerField(default=50)  # 0-100 %
    image_position_y = models.PositiveSmallIntegerField(default=50)  # 0-100 %
    image_zoom = models.DecimalField(max_digits=3, decimal_places=2, default=1)  # 1.00-3.00

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
- Gestión de imágenes (incluye encuadre, ver 5.5)

### 5.5 Encuadre de imagen de producto (NUEVA FUNCIONALIDAD, portada desde Super Cocina del Valle)

**Propósito**: al editar un producto (`/menu/products/<id>/edit/`), quien administra el menú puede arrastrar la fotografía dentro de un recuadro y ajustar el acercamiento para elegir qué parte de la imagen se ve en las tarjetas de producto, en vez de que Django recorte el centro automáticamente.

**Modelo** (`menu/models.py`): `Product.image_position_x` / `image_position_y` (0-100, % desde la izquierda/arriba) y `image_zoom` (1.00-3.00). Migración `0007_product_image_position_x_product_image_position_y_and_more`.

**Formulario** (`menu/forms.py`): `ProductForm` incluye los tres campos como `HiddenInput`, y el campo `image` usa el widget `ProductImageInput` (`menu/widgets.py`, plantilla `menu/templates/menu/widgets/product_image_input.html`) que dibuja la vista previa, el botón de eliminar y el panel de encuadre.

**Plantilla del formulario** (`menu/templates/menu/product_form.html`): el `<form>` lleva `data-product-editor`; como itera los campos genéricamente, los campos ocultos se detectan con `{% if field.is_hidden %}` para no mostrarles etiqueta.

**JavaScript** (`static/js/product-image-framing.js`): maneja el arrastre (Pointer Events) dentro de `.product-image-crop-window`, el control de acercamiento y el botón "Restablecer encuadre". Actualiza `image_position_x/y` e `image_zoom` en vivo.

**CSS** (`static/css/app.css`): bloque `.product-image-control` y relacionados (usa las variables de tema `--surface`, `--accent`, etc., compatible con modo oscuro). Las tarjetas de producto aplican el encuadre vía variables CSS inline: `style="--product-image-x:{{ product.image_position_x }}%;--product-image-y:{{ product.image_position_y }}%;--product-image-zoom:{{ product.image_zoom }}"`, leídas por `object-position`/`transform: scale` en `.product-card-image` y `.product-identity img`.

**Dónde se aplica** (todas las plantillas que muestran `product.image`): `menu/menu_list.html`, `menu/menu_configuration.html` (miniatura de la tabla), `orders/order_create.html`, `orders/order_edit.html` (ambas tarjetas: productos ya agregados y catálogo para agregar).

**Si se agrega una nueva plantilla que muestre `product.image`**: debe incluir las mismas variables CSS inline (`--product-image-x/y/zoom`) para que el encuadre se respete ahí también; si no, la imagen se mostrará centrada sin recorte personalizado (degradación segura, no rompe nada).

**Nota de tamaño y layout (2026-09-22, versión final: `max-width: 320px`)**: a pedido del desarrollador (la imagen ocupaba demasiado espacio visual), el panel de encuadre pasó por varias vueltas: full width → 70px ("un tercio" literal, pero el texto no cabía y forzaba demasiadas líneas) → 140px (ya no se veía apretado, pero el recuadro de recorte quedaba demasiado chico para arrastrar con precisión, según el desarrollador) → **320px**, elegido explícitamente por el desarrollador entre "mediano (~220px)" y "grande (~320px)" cuando se le preguntó. Con 320px la tipografía interna (`.product-image-framing > strong/small/label`, botón de reset) también se agrandó proporcionalmente — estaba reducida a propósito para caber en 140px y se veía desproporcionadamente chica a 320px.

**`.product-image-control` ya NO es un grid de 2 columnas lado a lado — es `display:flex; flex-direction:column;`** (imagen+botón arriba, panel de encuadre abajo, cada uno en su propio recuadro vía `.product-image-left`). Se cambió después de tres intentos fallidos con grid de 2 columnas: aun con `align-items:start`, dos columnas de alturas muy distintas (el panel de encuadre siempre termina más alto que la miniatura+botón) dejaban un hueco vacío visible del lado corto. Apilar verticalmente elimina el problema de raíz — no intentar volver a ponerlos lado a lado sin resolver antes ese desbalance de alturas.

**Lección de CSS Grid descubierta en el camino** (aplica también fuera de este componente): un elemento de grid no se encoge por debajo del ancho mínimo de su propio contenido (`min-width` resuelve a `auto`, no a `0`) — un botón con una palabra larga sin espacios (ej. "Restablecer") puede ignorar silenciosamente un `max-width` más chico que esa palabra. Si un `max-width`/`width` en un hijo de grid o flex parece no aplicarse pese a estar bien escrito, agregar `min-width: 0` explícito a ese hijo antes de sospechar de otra cosa.

**Cómo se verificó esta vez**: los dos intentos anteriores (70px con grid de 2 columnas, luego el primer intento de `min-width:0` sin cambiar el layout) se dieron por buenos sin comprobación visual real y el desarrollador reportó que seguían mal — incluso tras cerrar el navegador por completo y probar en uno distinto, descartando caché. Recién en el tercer intento se instaló Playwright temporalmente (`pip install playwright` + `playwright install chromium`, desinstalado al terminar) para tomar capturas reales contra un servidor de prueba en el puerto 8010 (para no chocar con el del desarrollador en 8000) antes de reportar el arreglo como terminado. **Lección: para bugs de layout/CSS que ya fallaron una vez con una corrección "leída pero no vista", verificar con una captura real antes de reportarlo como resuelto, en vez de razonar el CSS una segunda vez a ciegas.**

**Cuarto hallazgo el mismo día, tras la captura real**: incluso con el layout apilado ya corregido, quedaba una barra vacía larga junto a la miniatura de la imagen. Causa: `.product-current-image`/`.product-image-placeholder` eran un grid fijo de 2 columnas (`24px` ícono + `1fr` texto); al elegir un archivo, el JS (`product-image-framing.js`) reemplaza los hijos del placeholder por sólo la miniatura nueva (`placeholder.replaceChildren(preview)`), pero la segunda columna del grid seguía reservando espacio aunque ya no hubiera texto ahí. Se cambió `.product-current-image`/`.product-image-placeholder` de `display:grid` con columnas fijas a `display:flex; width:fit-content;`, para que el contenedor se ajuste al contenido real (uno o dos hijos) en vez de reservar una columna vacía.

### 5.6 Mayúscula inicial automática en todos los campos de texto (NUEVA FUNCIONALIDAD, 2026-09-22)

**Propósito**: a pedido del desarrollador, cualquier campo de texto libre del sitio (no solo productos) pone en mayúscula la primera letra automáticamente mientras se escribe.

**Implementación**: `static/js/capitalize-first-letter.js` (con su versión transpilada en `static/js/legacy/`, generada por `npm run build:legacy`) escucha el evento `input` a nivel de `document` (delegación de eventos, cubre campos agregados dinámicamente) y aplica la mayúscula inicial a cualquier `<input type="text">`, `<input>` sin atributo `type`, o `<textarea>`, en cualquier página que extienda `templates/base.html` (o sea, todo el sitio salvo la pantalla de login, que no tiene campos de texto libre). Se carga junto a los demás scripts globales en `base.html`, vía `{% compatible_js 'capitalize-first-letter.js' %}`.

**Cómo excluir un campo puntual**: agregar el atributo `data-no-capitalize` a ese `<input>`/`<textarea>` (por ejemplo, para códigos, referencias u otro texto donde la mayúscula automática no tenga sentido). Todavía no se excluyó ningún campo específico — si algún campo del sitio se comporta mal con esto, agregar el atributo ahí en vez de tocar el script.

**Reforzado en el servidor sólo para el nombre de producto**: `menu/forms.py` → `ProductForm.clean_name()` capitaliza la primera letra al guardar, por si el valor llega por otra vía sin pasar por el JS (API, formulario sin JS, etc.). El resto de los formularios (`CategoryForm`, `PackagingTypeForm`, campos de `orders`, etc.) **no** tienen este refuerzo del lado servidor todavía — sólo cuentan con el comportamiento del JS global. Si se necesita la misma garantía a nivel de base de datos en algún otro campo específico, replicar el mismo patrón de una línea en el `clean_<campo>` correspondiente.

### 5.7 Editor integrado de ingredientes/complementos + orden visual automático (NUEVA FUNCIONALIDAD, portada desde Super Cocina del Valle, 2026-09-22)

**Propósito**: a pedido del desarrollador, reemplaza el flujo anterior (páginas separadas para crear/editar cada grupo de opciones y cada ingrediente, con recarga completa) por el mismo editor integrado que ya existía en Super Cocina: todos los grupos e ingredientes de un producto se agregan, editan, reordenan (↑/↓) y eliminan dentro del propio formulario del producto, en memoria, y se guardan junto con el resto del producto en un solo envío.

**Diferencia deliberada con Super Cocina**: no se portó el sistema de "familias de grupos compartidos" (`shared_key`, `shared_group_edit`, edición que se propaga en vivo a todos los productos que usan ese grupo) porque Suerte Café no tenía ese concepto. Se conservó el equivalente que Suerte Café ya usaba (pegar un grupo existente como copia independiente), ahora integrado como botón "Asociar grupo" dentro del propio editor en vez de un formulario aparte.

**Modelo**: se agregó `ProductOption.replacement_pair` (CharField, para pares de sustitución tipo "Leche" en Leche entera/deslactosada) para tener paridad completa con Super Cocina. Migración `menu.0008_productoption_replacement_pair`.

**Backend** (`menu/customization.py`, nuevo, portado de Super Cocina sin las partes de `shared_key`): `serialize_product_customization`/`serialize_group` arman el JSON que ve el editor al cargar la página; `parse_customization_payload` vuelve a validar todo del lado servidor (nombres únicos, al menos un ingrediente por grupo, una sola opción estándar en grupos de elección única, pares de sustitución completos, etc. — el JS nunca es la única validación); `sync_product_customization` crea/actualiza/borra grupos y opciones comparando IDs, conservando los existentes. `menu/views.py` → `product_create`/`product_edit` ahora envuelven el guardado del producto y `sync_product_customization` en `transaction.atomic()`.

**Frontend**: `static/js/product-customization-editor.js` (copiado tal cual de Super Cocina, es agnóstico del backend) + fieldset `#product-ingredients` en `menu/templates/menu/product_form.html` + estilos nuevos en `static/css/app.css` (`.integrated-*`, usando los tokens de tema `var(--surface)`, `var(--accent)`, etc.). Como en Super Cocina, el orden visual de grupos y opciones **ya no se escribe a mano**: cada vez que se guarda, se asigna automáticamente según la posición en la lista (`(índice + 1) * 10`); los botones ↑/↓ son la única forma de reordenar.

**Rutas/vistas eliminadas** (reemplazadas por el editor integrado, ya no existen): `option_group_create`, `option_group_copy`, `option_group_edit`, `option_group_delete`, `product_option_create`, `product_option_edit`, `product_option_delete`, y los formularios `ProductOptionGroupForm`, `ProductOptionForm`, `ProductOptionGroupCopyForm`. Las plantillas `menu/customization_form.html` y `menu/product_configuration.html` se borraron. La URL `menu:product_configuration` (enlazada como "Opciones" desde la tabla de productos en `menu_configuration.html`) se conservó, pero ahora sólo redirige a `menu:product_edit#product-ingredients`.

**Orden visual de "envases" (`PackagingType`)**: este modelo no tiene un editor integrado como grupos/opciones (sigue con su formulario propio y separado), así que al crear uno nuevo el campo "Orden visual" ahora llega precargado con el siguiente número disponible (`menu/views.py` → `packaging_type_form`), en vez de forzar a escribirlo a mano o dejarlo en 0.

**Corrección de datos existentes (2026-09-22, una sola vez, ya aplicada)**: antes de este cambio varios productos ya tenían grupos/opciones con `sort_order` en 0 o repetido (creados con el formulario viejo). Se renumeraron todos por script (no quedó como comando de gestión permanente): `PackagingType` a una secuencia simple 0,1,2... global; `ProductOptionGroup` por producto y `ProductOption` por grupo, ambos al esquema `10,20,30...` (igual al que ahora asigna el editor), conservando el orden relativo que ya tenían (ordenando por `sort_order` actual y luego `id` como desempate) — no se movió visualmente nada, sólo se limpiaron los valores duplicados/en cero.

**Bug encontrado por el desarrollador el mismo día — `replacement_pair` no hacía nada al tomar un pedido**: el desarrollador configuró en Chilaquiles el grupo "Chilaquiles" (elección múltiple) con "Roja"/"Verde" compartiendo `replacement_pair="Salsa"`, esperando que elegir una apagara la otra al personalizar un pedido — pero no pasaba nada. Causa: al portar `replacement_pair` desde Super Cocina sólo se llevó la mitad del sistema (el editor de administración, donde ese campo sólo afecta cuál opción es "estándar"); la otra mitad — el comportamiento real al armar un pedido — vive en un lugar totalmente distinto del código (`orders/`, no `menu/`) y nunca se tocó. En Super Cocina esa segunda mitad son dos piezas: (1) del lado del navegador, `static/js/product-selector.js` desmarca automáticamente la opción hermana con el mismo `replacement_pair` dentro del mismo grupo; (2) del lado del servidor, `menu/selection.py::resolve_product_selection()` rechaza con `ValidationError` si de todos modos llegan seleccionadas dos opciones del mismo par (respaldo si el JS se evita). Se portaron ambas piezas a Suerte Café: `orders/services.py::prepare_configured_item()` ahora rechaza pares repetidos (mismo patrón, sin necesidad de un módulo nuevo tipo `selection.py`); `static/js/product-customizer.js` (el diálogo compartido de personalización, usado en `order_create.html` y `order_edit.html` — Suerte Café no tiene portal público separado como `/pedir/` de Super Cocina, así que no hay un tercer lugar que cubrir) ahora desmarca la opción hermana al vuelo. También se agregó `"replacement_pair": option.replacement_pair` al payload que arma `orders/views.py::prepare_product_customizations()` — sin eso, el JS nunca hubiera visto el dato aunque tuviera la lógica, porque ese payload (distinto del de `menu/customization.py`) nunca lo incluía. **Lección para el futuro: si un campo tiene un nombre que sugiere un comportamiento en tiempo real (como "par de sustitución"), no dar por completo el port sólo por haber replicado la parte de administración/edición — verificar también dónde se usa ese campo en el flujo real de la aplicación (aquí, tomar un pedido) antes de darlo por terminado.**

**Ajuste inmediato el mismo día — el arreglo de arriba tampoco se veía al probarlo**: el desarrollador reportó que, tras el cambio, seleccionar "Roja" seguía sin apagar "Verde". Causa: se editó `static/js/product-customizer.js` pero se olvidó subir su versión de caché (`?v=3` seguía igual en `order_create.html`/`order_edit.html`) — el mismo tipo de descuido ya documentado arriba para `app.css` y para `internal-order-form.js` en Super Cocina, ahora repetido con un tercer archivo. Se subió a `?v=4` en ambas plantillas y se corrió `npm run build:legacy` (que tampoco se había vuelto a correr desde el cambio). Verificado esta vez con una interacción real (clic programático en "Roja" vía Playwright, no sólo lectura del código ni prueba server-side): antes del clic, `Verde=true/Roja=false`; después del clic, `Verde=false/Roja=true`. **Lección reforzada: cada vez que se edita un archivo `static/js/*.js` o `static/css/*.js` ya existente (no uno nuevo) en este proyecto, revisar en el mismo cambio si su `<script>`/`<link>` tiene un `?v=` que subir, sin esperar a que el desarrollador reporte que "no pasó nada" — es el error más repetido de esta sesión.**

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

**Última actualización**: 22 de septiembre de 2026
**Versión**: 1.1 - Con funcionalidad de cocina con filtros de barras y encuadre de imagen de producto implementadas