/**
 * Sistema centralizado y robusto de detección/formateo de origen de suscripciones.
 *
 * Filosofía:
 * - Cada `source` se guarda como un slug estable (kebab-case) en BD para análisis consistente.
 * - La UI lo traduce a una etiqueta humana ("Blog", "Footer", "Inicio"…) vía `getSourceLabel`.
 * - Cuando se monta un nuevo punto de suscripción, basta con pasar un `source` explícito
 *   o dejar que `detectSubscriptionSource()` lo infiera desde la URL actual.
 *
 * Para agregar un nuevo origen:
 *  1. Si tienes contexto del componente, pasa un `source` explícito al <SubscribeModal />
 *     (ej: "footer", "popup-salida", "checkout").
 *  2. Si no lo pasas, el detector inferirá el origen desde la ruta.
 *  3. Agrega su etiqueta legible en `SOURCE_LABELS` para que aparezca bonita en la UI.
 */

/** Mapa de slugs → etiquetas humanas para la UI. */
export const SOURCE_LABELS: Record<string, string> = {
  // Secciones del sitio
  blog: "Blog",
  inicio: "Inicio",
  footer: "Footer",
  navbar: "Navbar",
  servicios: "Servicios",
  planes: "Planes",
  obituarios: "Obituarios",
  memoriales: "Memoriales",
  contacto: "Contacto",
  preguntas: "Preguntas Frecuentes",
  cobertura: "Cobertura RM",
  comuna: "Landing Comuna",
  pagos: "Pagos",
  seguimiento: "Seguimiento",
  "popup-salida": "Popup Salida",

  // Mantener compatibilidad con datos legacy
  blog_floating_cta: "Blog",
  "blog-floating-cta": "Blog",
};

/** Detecta automáticamente la sección desde una ruta (pathname). */
export function detectSourceFromPath(pathname: string): string {
  const path = pathname.toLowerCase();

  if (path.startsWith("/blog")) return "blog";
  if (path.startsWith("/funeraria/")) return "comuna";
  if (path.startsWith("/cobertura")) return "cobertura";
  if (path.startsWith("/obituarios")) return "obituarios";
  if (path.startsWith("/memoriales")) return "memoriales";
  if (path.startsWith("/servicios")) return "servicios";
  if (path.startsWith("/planes")) return "planes";
  if (path.startsWith("/contacto")) return "contacto";
  if (path.startsWith("/preguntas")) return "preguntas";
  if (path.startsWith("/pagos")) return "pagos";
  if (path.startsWith("/seguimiento")) return "seguimiento";
  if (path === "/" || path === "") return "inicio";

  // Fallback: primer segmento de la ruta como slug
  const seg = path.split("/").filter(Boolean)[0];
  return seg ?? "inicio";
}

/**
 * Detecta el origen de una suscripción usando la URL actual del navegador.
 * Pensado para llamarse desde el cliente al momento del submit.
 */
export function detectSubscriptionSource(): string {
  if (typeof window === "undefined") return "desconocido";
  return detectSourceFromPath(window.location.pathname);
}

/** Convierte un slug en su etiqueta legible. */
export function getSourceLabel(source: string | null | undefined): string {
  if (!source || !source.trim()) return "Desconocido";
  const key = source.trim().toLowerCase();
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
  // Auto-prettify para slugs nuevos no registrados aún
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
