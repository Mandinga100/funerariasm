---
name: blog-structure
description: Estructura uniforme y profesional para todo blog post (markdown), aplicada en BlogPost render y prompts de IA
type: feature
---

Estructura estándar OBLIGATORIA para cada blog en `blog_posts.content` (markdown):

1. `# Título principal` (H1) — extraído por el render y mostrado vía componente `<ArticleTitle>` (ícono dorado + serif italic + separador). NO se renderiza el `# ` crudo.
2. Párrafo intro empático con "**Funeraria Santa Margarita**" en negrita.
3. Mínimo 4-6 `## Secciones` (H2) con contenido sustancial.
4. `### Subsecciones` (H3) cuando aporten.
5. Listas con `- ` o numeradas, **negritas** en conceptos clave.
6. `## Conclusión` con párrafo empático de cierre.
7. **OBLIGATORIO** dentro de Conclusión: `### Por qué elegir Funeraria Santa Margarita` con 4-5 bullets contextuales (precios transparentes, servicio integral 24/7, calidad, cada familia es un caso completo no un número de venta) + cierre comparativo con otras funerarias.
8. `## Preguntas Frecuentes` con exactamente 4 `### ¿Pregunta?` + respuesta de 2-3 oraciones.

### Quick Answer (componente `<QuickAnswer>`)
- Se extrae automáticamente del primer párrafo después del primer H2.
- Máximo 320 caracteres, **siempre completo**, cierra con punto.
- **NUNCA** usar `...` ni `…` (truncado prohibido). El render asegura corte en la última frase completa si excede.

### CTAs en blog post
- **Eliminadas** todas las CTAs intermedias cada 2 H2 (lectura limpia).
- Solo queda **una CTA final** después de Preguntas Frecuentes (`<BlogCTA variant={ctaVariants[0]} />`).
- `<FloatingCTA>` levantado a `bottom-44` (mobile) / `bottom-28` (desktop) para no chocar con la barra "ayuda inmediata". Un solo botón "Orientación Personalizada" → `/contacto`, estilo gold con hover lift.

### Cómo se aplica
- Render: `src/pages/BlogPost.tsx` extrae H1 → `<ArticleTitle>`, extrae quick answer sin elipsis, no inyecta CTAs intermedias.
- Saneamiento masivo: edge function `sanitize-blog-structure` (admin-only) — limpia `…` e inyecta sección "Por qué elegir" idempotentemente. Botón "Estandarizar todos" en `/admin/blog`.
- Generación nueva: `generate-blog-post` y `standardize-blog-content` ya tienen los prompts actualizados con estas reglas.
- Marker de idempotencia: `<!-- why-choose-fsm:v1 -->` impide duplicar la sección.

### Posts en HTML (legacy)
16 de 44 posts están guardados como HTML en BD (`<p>`, `<details class="faq-item">`). El edge function de saneamiento detecta el formato y inyecta `<h3>Por qué elegir...</h3>` antes del FAQ. El render markdown del BlogPost no los procesa óptimamente — idealmente migrar a markdown vía `standardize-blog-content` cuando se quiera refinar.
