# Contexto de despliegue — Suerte Café

Este documento sirve para que otro asistente pueda guiar el despliegue sin tener que descubrir nuevamente la arquitectura del proyecto. No contiene contraseñas ni secretos.

## Objetivo

Desplegar la aplicación web de Suerte Café en una instancia básica de Amazon Lightsail con aproximadamente 1 GB de RAM. La aplicación será utilizada como sistema de comandas/POS dentro de una cafetería, principalmente desde computadoras y iPad mini.

La opción prevista es:

- Ubuntu en Amazon Lightsail.
- Nginx como proxy inverso y servidor de archivos estáticos/media.
- Gunicorn como servidor WSGI.
- PostgreSQL.
- HTTPS mediante Let's Encrypt/Certbot.
- Un servicio `systemd` para mantener la aplicación activa.

Con 1 GB de RAM se recomienda comenzar con un solo proceso de Gunicorn y limitar cuidadosamente PostgreSQL. También conviene habilitar swap para reducir el riesgo de cierre por falta de memoria.

## Tecnología del proyecto

- Python 3.12 durante el desarrollo.
- Django 6.0.8.
- PostgreSQL mediante psycopg 3.
- HTML renderizado por Django, CSS y JavaScript sin framework SPA.
- Pillow para imágenes.
- Zona horaria: `America/Mexico_City`.
- Idioma: `es-mx`.
- Entrada WSGI: `config.wsgi:application`.
- Archivo principal de configuración: `config/settings.py`.
- Dependencias: `requirements.txt`.

## Módulos principales

- `accounts`: inicio de sesión, perfiles, empleados y permisos.
- `menu`: productos, categorías, opciones personalizables y tipos de envase.
- `orders`: pedidos, pagos, cocina, clientes, reportes, gastos y conciliación.
- `static`: CSS, JavaScript, iconos y recursos propios de la app.
- `media`: imágenes cargadas por usuarios, productos y perfiles.
- `templates`: plantillas generales y páginas de error.

## Funciones relevantes para producción

- Pedidos para comer aquí, entrega y recoger.
- Mapa de mesas.
- Personalización de productos y notas.
- Envases configurables y cargos automáticos.
- Métodos de pago: efectivo, tarjeta y transferencia.
- Propinas y cálculo de cambio.
- Vista de cocina con actualización periódica y barras fría/caliente.
- Reportes de ventas y propinas.
- Apertura, gastos, cierre y conciliación diaria.
- Registros de clientes y direcciones.
- Permisos administrativos.
- Páginas personalizadas para errores 400, 403, 404 y 500.

La actualización en vivo de Cocina y Pedidos actualmente funciona mediante solicitudes HTTP periódicas; no utiliza WebSockets, Redis ni Celery.

## Base de datos y migraciones

La aplicación usa PostgreSQL incluso durante el desarrollo. Las migraciones existentes están aplicadas hasta:

- `accounts`: `0004_configure_default_group_permissions`
- `menu`: `0006_category_preparation_station_and_more`
- `orders`: `0009_dailyreconciliation_expense`

Durante el despliegue se debe ejecutar:

```bash
python manage.py migrate
```

Antes de importar información hay que decidir si producción iniciará vacía o si se trasladarán la base PostgreSQL y la carpeta `media` actuales.

## Variables de entorno

El proyecto carga un archivo `.env` mediante `django-environ`. Existe `.env.example` como referencia.

Producción necesita como mínimo:

```dotenv
DJANGO_SECRET_KEY=GENERAR_UNA_CLAVE_NUEVA_Y_SECRETA
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=dominio.com,www.dominio.com,IP_PUBLICA
DJANGO_CSRF_TRUSTED_ORIGINS=https://dominio.com,https://www.dominio.com
DJANGO_SECURE_SSL_REDIRECT=False
DJANGO_SECURE_COOKIES=False
DJANGO_HSTS_SECONDS=0

DB_NAME=suerte_cafe_db
DB_USER=suerte_cafe_user
DB_PASSWORD=CONTRASENA_SEGURA
DB_HOST=localhost
DB_PORT=5432
```

Primero se debe comprobar HTTPS. Después se cambian las variables de seguridad a:

```dotenv
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_SECURE_COOKIES=True
```

HSTS debe activarse únicamente cuando HTTPS ya esté comprobado. Se puede comenzar con un valor pequeño y aumentarlo posteriormente.

Nunca se debe subir ni compartir el `.env` real. El archivo `.env.example` sí puede mantenerse en el repositorio porque no contiene secretos reales.

## Pendientes técnicos antes del despliegue

1. Agregar Gunicorn a `requirements.txt`.
2. Agregar `STATIC_ROOT` a `config/settings.py`.
3. Ejecutar y comprobar `python manage.py collectstatic`.
4. Crear la configuración de Gunicorn y su servicio `systemd`.
5. Crear la configuración de Nginx para aplicación, `/static/` y `/media/`.
6. Configurar dominio, DNS, HTTPS y firewall.
7. Crear PostgreSQL, usuario y permisos de la base.
8. Decidir si la base estará en la misma instancia o en un servicio externo.
9. Crear estrategia de respaldo para PostgreSQL y `media`.
10. Ejecutar `python manage.py check --deploy` usando las variables reales de producción.
11. Confirmar que todos los cambios estén en Git antes de clonar el repositorio en Lightsail.

Actualmente `check --deploy` advierte que el entorno local tiene `DEBUG=True`, no obliga HTTPS, no usa cookies seguras y no tiene HSTS. Es correcto para desarrollo, pero no para producción.

## Seguridad y acceso

- Menú, Reportes, Clientes y administración financiera son exclusivos del administrador.
- Empleados normales pueden crear pedidos y utilizar las vistas operativas autorizadas.
- Django Admin existe en `/admin/`.
- La configuración tiene `SECURE_PROXY_SSL_HEADER` para reconocer HTTPS enviado por Nginx.
- Las contraseñas, claves, respaldos y archivos `.env` no deben guardarse públicamente.
- Conviene revisar si se habilitarán validadores de contraseña, pues actualmente `AUTH_PASSWORD_VALIDATORS` está vacío.

## Archivos estáticos y archivos cargados

- Código estático fuente: `static/`.
- Archivos cargados: `media/`.
- `MEDIA_ROOT` ya está configurado.
- `STATIC_ROOT` todavía debe agregarse.
- En producción Django no debe servir directamente los archivos `media`; Nginx debe hacerlo.
- La carpeta `media` requiere respaldo porque no se recupera solamente restaurando la base de datos.

## Orden recomendado de despliegue

1. Hacer respaldo y commit del proyecto.
2. Crear instancia Lightsail y dirección IP estática.
3. Configurar DNS si ya existe un dominio.
4. Instalar sistema, Python, entorno virtual, PostgreSQL, Nginx y herramientas necesarias.
5. Clonar el repositorio.
6. Crear `.env` de producción con permisos restringidos.
7. Instalar dependencias.
8. Crear/restaurar la base de datos.
9. Ejecutar migraciones y `collectstatic`.
10. Probar Gunicorn directamente.
11. Activar servicio `systemd`.
12. Configurar y probar Nginx por HTTP.
13. Instalar certificado HTTPS.
14. Activar cookies seguras y redirección HTTPS.
15. Ejecutar comprobaciones y pruebas manuales.
16. Configurar respaldos y monitoreo básico.

## Pruebas posteriores

- Login de administrador y empleado.
- Restricciones administrativas y errores 403.
- Crear pedido con cada tipo y método de pago.
- Efectivo, propina y cálculo de cambio.
- Personalizaciones y notas de productos.
- Envases automáticos y editables.
- Cocina en Barra fría, Barra caliente y 2 players.
- Actualización automática de pedidos sin refrescar manualmente.
- Reportes, gastos y conciliación diaria.
- Carga y visualización de imágenes.
- Páginas 404 y 500 sin mostrar información técnica.
- Uso desde iPad mini sin desplazamiento horizontal.
- Reinicio de la instancia y arranque automático de Gunicorn.

## Preguntas que el asistente debe hacer antes de dar comandos definitivos

1. ¿Ya se creó la instancia Lightsail y qué versión de Ubuntu usa?
2. ¿Ya existe dominio o se comenzará con la IP pública?
3. ¿PostgreSQL estará en la misma instancia?
4. ¿Se necesita trasladar la información actual o iniciar con base vacía?
5. ¿El repositorio es público o privado y cómo se autenticará Git?
6. ¿Dónde se guardarán los respaldos?

## Instrucción sugerida para ChatGPT

> Lee completamente el archivo adjunto `DEPLOYMENT_HANDOFF.md`. Quiero desplegar esta aplicación Django en Amazon Lightsail. Guíame paso a paso y espera mi confirmación y la salida de cada comando antes de continuar. No inventes valores de dominio, rutas, usuarios, contraseñas ni direcciones IP. Explica qué debo reemplazar y nunca me pidas que publique secretos. Si un comando falla, analiza su salida antes de sugerir el siguiente. Comienza revisando conmigo las seis preguntas pendientes del documento.

