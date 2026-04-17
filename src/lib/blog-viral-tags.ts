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
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const tag of [...existingTags, ...viral]) {
    const key = tag.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      ordered.push(tag.trim());
    }
  }
  return ordered;
}
