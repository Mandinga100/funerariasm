/**
 * Template memorials — los 4 ejemplos pre-cargados que sirven como demo
 * pública del módulo "Legados Eternos".
 *
 * Cualquier interacción (condolencias) sobre estos memoriales debe ser
 * SOLO de sesión: nunca persiste en la base de datos. Los memoriales
 * creados manualmente desde el CRM tienen IDs distintos y persisten
 * normalmente.
 */
export const TEMPLATE_MEMORIAL_IDS = new Set<string>([
  "a1b2c3d4-1111-4000-a000-000000000001", // Luis Alberto Paredes Muñoz
  "a1b2c3d4-2222-4000-a000-000000000002", // Rosa Inés Figueroa Valdés
  "a1b2c3d4-3333-4000-a000-000000000003", // Fernando Javier Soto Bravo
  "a1b2c3d4-4444-4000-a000-000000000004", // Elena del Carmen Reyes Ortiz
]);

export function isTemplateMemorial(memorialId: string | null | undefined): boolean {
  if (!memorialId) return false;
  return TEMPLATE_MEMORIAL_IDS.has(memorialId);
}
