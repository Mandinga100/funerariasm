/**
 * Generate viral / high-engagement / SEO-AEO-GEO-LLMO optimized tags.
 *
 * Strategy:
 *  - Cover the entire Chilean funeral sector (servicios fúnebres, cremación, sepultación,
 *    velatorios, traslados, previsión, duelo, etc.).
 *  - Cover all of Chile geographically (Santiago + 16 regiones + comunas clave) so the blog
 *    appears in "near me" / regional / hyperlocal searches.
 *  - Cover intent variations (qué hacer, cómo, dónde, precio, urgente, 24/7, ayuda).
 *  - Cover entity / brand reinforcement (Funeraria Santa Margarita, Chile, líder, confianza).
 *  - Cover trending year qualifiers (2025, 2026) for freshness signals.
 *
 * Returns a deduplicated, ordered list ready to render. Original tags first, then SEO additions.
 * Capped to a sensible maximum to avoid keyword-stuffing penalties.
 */

const MAX_TAGS = 14;

/** Always-on sector + brand + trust signals shown on every article. */
const CORE_SECTOR_TAGS = [
  "Funeraria en Chile",
  "Servicios Funerarios 24/7",
  "Funeraria Santa Margarita",
  "Atención Inmediata",
];

/**
 * Geographic coverage — Chile entero a nivel de REGIÓN (no comunas/ciudades).
 * Decisión editorial: usar siempre el nombre de la región (ej. "Región Metropolitana"
 * en vez de "Santiago" o comunas específicas) para evitar inconsistencias y reforzar
 * cobertura nacional en SEO/AEO/GEO/LLMO.
 */
const GEO_TAGS_CHILE = [
  "Región Metropolitana",
  "Región de Valparaíso",
  "Región del Biobío",
  "Región de Coquimbo",
  "Región de Antofagasta",
  "Región de La Araucanía",
  "Región de Los Lagos",
  "Región de O'Higgins",
  "Región del Maule",
  "Región de Tarapacá",
  "Región de Arica y Parinacota",
  "Región de Ñuble",
  "Región de Magallanes",
  "Región de Aysén",
  "Región de Atacama",
  "Región de Los Ríos",
];

/** Intent + sector-specific tag pools per category, optimized for SEO/AEO/GEO/LLMO. */
const VIRAL_TAGS_BY_CATEGORY: Record<string, string[]> = {
  guias: [
    "Guía Completa 2026",
    "Trámites Funerarios Chile",
    "Qué Hacer ante un Fallecimiento",
    "Información Esencial",
    "Asesoría Funeraria",
  ],
  servicios: [
    "Servicios Fúnebres Premium",
    "Cremación y Sepultación",
    "Velatorios y Ceremonias",
    "Traslados Nacionales",
    "Atención Inmediata 24/7",
  ],
  prevision: [
    "Previsión Funeraria",
    "Planes Funerarios Chile",
    "Planifica con Amor",
    "Tranquilidad Familiar",
    "Precios Transparentes",
  ],
  duelo: [
    "Acompañamiento en el Duelo",
    "Apoyo Emocional",
    "Sanar el Duelo",
    "Proceso de Duelo Saludable",
  ],
  "salud-mental": [
    "Bienestar Emocional",
    "Salud Mental y Duelo",
    "Cuidado Integral",
    "Ayuda Profesional",
  ],
  "contencion-emocional": [
    "Contención Emocional 24/7",
    "Apoyo Profesional",
    "No Estás Solo",
    "Acompañamiento Familiar",
  ],
  "apoyo-familiar": [
    "Apoyo Familiar Integral",
    "Familia Unida",
    "Acompañamiento Profesional",
    "Red de Contención",
  ],
  novedades: [
    "Novedades del Sector Funerario",
    "Tendencias 2026",
    "Innovación Funeraria",
    "Nuevo en Chile",
    "Información Actualizada",
  ],
};

const FALLBACK_VIRAL = [
  "Funeraria de Confianza",
  "Atención Personalizada",
  "Servicio Profesional",
];

/**
 * Pick a deterministic-ish geo subset based on category content so different articles
 * surface different regions over time without random churn.
 */
function pickGeoTags(catKey: string, count: number): string[] {
  if (!catKey) return GEO_TAGS_CHILE.slice(0, count);
  // Simple stable hash from category key
  let hash = 0;
  for (let i = 0; i < catKey.length; i++) hash = (hash * 31 + catKey.charCodeAt(i)) >>> 0;
  const start = hash % GEO_TAGS_CHILE.length;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(GEO_TAGS_CHILE[(start + i) % GEO_TAGS_CHILE.length]);
  }
  return out;
}

// Words kept lowercase in Title Case (Spanish style guide for blog tags / SEO).
const LOWERCASE_WORDS = new Set([
  "de", "del", "la", "el", "los", "las", "y", "o", "u", "en", "para", "por",
  "con", "sin", "a", "al", "un", "una", "unos", "unas", "que", "se",
]);

// Acronyms / brand tokens that must stay fully uppercase.
const UPPERCASE_TOKENS = new Set(["seo", "aeo", "geo", "llmo", "ia", "ai", "qr", "rcp", "rm"]);

/**
 * Title-case a tag for SEO/AEO/GEO/LLMO consistency:
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
  const categorySpecific =
    VIRAL_TAGS_BY_CATEGORY[catKey] ||
    Object.entries(VIRAL_TAGS_BY_CATEGORY).find(([k]) => catKey.includes(k))?.[1] ||
    FALLBACK_VIRAL;

  // Compose: existing + category-specific + sector core + 3 rotating geo tags.
  const geoSubset = pickGeoTags(catKey, 3);
  const combined = [
    ...existingTags,
    ...categorySpecific,
    ...CORE_SECTOR_TAGS,
    ...geoSubset,
  ];

  // Deduplicate (case-insensitive), preserve order, normalize to Title Case.
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const tag of combined) {
    const normalized = toTitleCaseTag(tag);
    const key = normalized.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      ordered.push(normalized);
      if (ordered.length >= MAX_TAGS) break;
    }
  }
  return ordered;
}
