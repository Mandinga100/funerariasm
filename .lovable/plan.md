## Fase 6: Memoriales + Búsqueda + Condolencias

### 1. Tabla `memorials` en la base de datos
- Campos: id, slug, full_name, birth_date, death_date, photo_url, biography, tribute_text, city, published, published_at, meta_title, meta_description
- RLS: lectura pública para publicados, escritura para autenticados

### 2. Tabla `condolences` (condolencias)
- Campos: id, memorial_id (FK → memorials), author_name, message, created_at, approved (boolean, default true)
- RLS: cualquiera puede insertar (enviar condolencia), lectura pública de aprobadas

### 3. Página `/memoriales` — Listado con búsqueda
- Grid de memoriales con fotos, nombres, fechas
- Barra de búsqueda por nombre o ciudad
- Diseño consistente con la estética del sitio (dorado, Playfair, solemne)

### 4. Página `/memoriales/:slug` — Detalle del memorial
- Foto, biografía completa, fechas, tributo familiar
- Sección de condolencias: listado de mensajes existentes
- Formulario para enviar nueva condolencia (nombre + mensaje)
- JSON-LD Schema.org

### 5. Actualizar sección Memoriales del homepage
- Mostrar los 3 memoriales más recientes en lugar de las imágenes estáticas actuales
- Link a `/memoriales`

### 6. Agregar ruta y navbar
- Ruta `/memoriales` y `/memoriales/:slug` en App.tsx
- Agregar datos de ejemplo (3-4 memoriales de muestra)
