/**
 * Generate viral / high-engagement tags based on the article's category and existing tags.
 * Returns a deduplicated, ordered list ready to render. Original tags first, then viral additions.
 */

const VIRAL_TAGS_BY_CATEGORY: Record<string, string[]> = {
  guias: ["Guía Completa 2026", "Trámites Chile", "Información Esencial"],
  servicios: ["Servicio Premium", "24/7 Disponible", "Atención Inmediata"],
  prevision: ["Planifica con Amor", "Tranquilidad Familiar", "Precios Transparentes"],
  duelo: ["Apoyo Emocional", "Acompañamiento", "Sanar el Duelo"],
  "salud-mental": ["Bienestar Emocional", "Cuidado Integral", "Salud Mental"],
  "contencion-emocional": ["Apoyo Profesional", "Contención 24/7", "No Estás Solo"],
  "apoyo-familiar": ["Familia Unida", "Apoyo Integral", "Acompañamiento Profesional"],
  novedades: ["Nuevo en Chile", "Tendencias 2026", "Información Actualizada"],
};

const FALLBACK_VIRAL = ["Funeraria de Confianza", "Atención 24/7", "Santa Margarita"];

// Words kept lowercase in Title Case (Spanish style guide for blog tags / SEO).
const LOWERCASE_WORDS = new Set([
  "de", "del", "la", "el", "los", "las", "y", "o", "u", "en", "para", "por",
  "con", "sin", "a", "al", "un", "una", "unos", "unas", "que", "se",
]);

// Acronyms / brand tokens that must stay fully uppercase.
const UPPERCASE_TOKENS = new Set(["seo", "aeo", "llmo", "ia", "ai", "qr", "rcp"]);

/**
 * Title-case a tag for SEO/AEO/LLMO consistency:
 * - First word always capitalized.
 * - Connector words (de, la, y, en…) stay lowercase mid-phrase.
 * - Numbers and acronyms preserved.
 */
function toTitleCaseTag(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, " ");
  if (!clean) return clean;
  const parts = clean.split(" ");
  return parts
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (UPPERCASE_TOKENS.has(lower)) return word.toUpperCase();
      if (/^\d+$/.test(word)) return word;
      if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function getViralTags(category: string | null, existingTags: string[] = []): string[] {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");

  const catKey = category ? normalize(category) : "";
  const viral =
    VIRAL_TAGS_BY_CATEGORY[catKey] ||
    Object.entries(VIRAL_TAGS_BY_CATEGORY).find(([k]) => catKey.includes(k))?.[1] ||
    FALLBACK_VIRAL;

  // Combine, deduplicate (case-insensitive), preserve order: existing first, then viral.
  // Normalize every tag to Title Case for SEO consistency across the blog.
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const tag of [...existingTags, ...viral]) {
    const normalized = toTitleCaseTag(tag);
    const key = normalized.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      ordered.push(normalized);
    }
  }
  return ordered;
}
