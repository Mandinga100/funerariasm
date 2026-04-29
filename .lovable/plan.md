# Plan — Componente `FuneralPlansSection`

## Objetivo
Crear un único componente nuevo, reutilizable, premium y editorial que renderice los 7 planes funerarios siguiendo la referencia visual (cards verticales altas, full-bleed, overlay oscuro, CTA "Ver detalle" al pie). **No** se modifica navbar, footer, layout, rutas ni backend. **No** se reemplaza el actual `PlansSection.tsx`.

## Archivos a crear (mínimo necesario)
1. `src/components/FuneralPlansSection.tsx` — sección principal + subcomponente `FuneralPlanCard` en el mismo archivo (mejor cohesión, sin sobre-fragmentar).

No se crean otros archivos. No se instalan librerías. No se tocan tokens globales (la paleta solicitada se aplica vía clases arbitrarias de Tailwind dentro del componente para no contaminar `index.css`).

## Datos
Array local tipado dentro del componente:

```ts
type FuneralPlan = {
  id: string;
  name: string;
  price: string;
  image: string;
  href: string;
};
```

7 entradas exactas: Margarita $1.290.000 · Azucena $1.390.000 · Acacia $1.990.000 · Orquídea $1.990.000 · Jazmín $2.790.000 · Castaño $3.990.000 · Raulí $3.990.000. Las imágenes reutilizan las rutas existentes `/assets/images/planes/plan-{id}.jpg` (ya presentes en el proyecto y en `catalogo.json`). `href` apunta a `/planes#{id}` reutilizando la ruta existente.

## Identidad visual
- Paleta aplicada con clases arbitrarias Tailwind (bg `#15130e`, card `#1e1b16`, hover `#2c2a24`, texto `#e8e2d8` / `#c4c7c7`, borde `rgba(142,145,146,0.22)`, acento `#e9c176` con hover `#f0cf92`).
- Tipografía: reutilizar `font-playfair` (serif del proyecto, equivalente editorial a Noto Serif) para heading y nombre del plan; `font-inter` (equivalente a Manrope) para precio, CTA y micro-tipografía. **No se cargan nuevas fuentes.**
- Sin gradientes fuertes, sin glassmorphism, sin sombras pesadas, sin badges, sin íconos decorativos, sin colores brillantes. Bordes sutiles de 1px y radios pequeños (`rounded-sm`).

## Estructura visual

```text
<section id="planes-funerarios" bg #15130e py-24/32>
  <div container max-w-[1280px]>
    <header center>
       h2 "Planes Funerarios"  (font-playfair, claro)
       <hr w-12 border-[#e9c176]/70>
    </header>

    <ul desktop:grid mobile:scroll-snap-x>
      [ FuneralPlanCard x7 ]
    </ul>
  </div>
</section>
```

### `FuneralPlanCard`
Estructura por card (alta y estrecha, ratio ~3/5):

```text
<a href=plan.href class="group relative aspect-[3/5] overflow-hidden bg-[#1e1b16] border border-[rgba(142,145,146,0.22)]">
  <img full-bleed object-cover loading=lazy alt=plan.name />
  <div absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15 />  <!-- overlay constante -->
  <div absolute inset-x-0 bottom-0 p-6 text-center>
     <h3 font-playfair text-[#e8e2d8] text-xl>{name}</h3>
     <p font-inter text-[#c4c7c7] text-sm mt-1>{price}</p>
     <span font-inter text-[10px] tracking-[0.25em] uppercase text-[#e9c176] group-hover:text-[#f0cf92] mt-4 inline-block>
        Ver detalle
     </span>
  </div>
</a>
```

## Responsive (mobile-first, breakpoints Tailwind)

- **Mobile (default)**: contenedor `flex overflow-x-auto snap-x snap-mandatory` con `gap-4`, scroll horizontal con scrollbar oculto. Cada card `basis-[82vw] shrink-0 snap-start`.
- **`md` (≥768px)**: `grid grid-cols-3 gap-5`, scroll desactivado. Las 7 cards fluyen en 3 columnas (3+3+1) con la última centrada — alternativa: dejar `md:grid-cols-3 lg:grid-cols-4` para una transición intermedia limpia.
- **`xl` (≥1280px)**: `grid-cols-7 gap-4` editorial — 7 cards verticales estrechas en una sola fila como en la referencia. Aspect ratio fijo `3/5` mantiene cards altas y legibles.

Sin layout shift (aspect-ratio fijo), sin comprimir las cards por debajo del ancho útil.

## Interacción
- Hover **solo desktop** (`md:`): borde pasa a `#e9c176/40`, overlay aclara levemente (`from-black/75`), CTA cambia a `#f0cf92`. Sin escala, sin flip, sin zoom fuerte.
- Transiciones `duration-500 ease-out` sobrias.
- `focus-visible:ring-1 ring-[#e9c176] ring-offset-2 ring-offset-[#15130e]` accesible.
- Touch limpio: `active:` ligero en mobile.

## Accesibilidad
- `<section aria-labelledby="planes-funerarios-title">`, `<h2 id="planes-funerarios-title">`.
- `<ul>` / `<li>` para la lista, cada card es un `<a>` con `aria-label="Ver detalle del Plan {name}"`.
- `alt` descriptivo en cada `<img>`.
- Contraste verificado (texto claro sobre overlay oscuro denso).
- Scrollbar oculto pero scroll por touch/teclado funcional.

## Entrega
El componente queda listo para importar (`import FuneralPlansSection from "@/components/FuneralPlansSection"`) e insertar en cualquier página existente sin modificar piezas globales. **No** se inserta automáticamente en ninguna página — eso queda a tu criterio en una iteración posterior.

## Checklist final
- [x] Solo se crea `FuneralPlansSection.tsx`
- [x] Respeta la composición de la referencia (7 cards verticales, overlay, CTA al pie)
- [x] Mobile: scroll horizontal con snap
- [x] Desktop: grid editorial de 7 columnas en `xl`
- [x] No toca navbar/footer/layout/rutas/backend
- [x] Sin nuevas dependencias ni nuevas fuentes
- [x] TS estricto, sin `any`
