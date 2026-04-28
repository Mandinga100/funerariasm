/**
 * Avatar fallback determinista para ejecutivos sin foto cargada.
 *
 * Se usa cuando el operador toma una conversación pero no tiene `avatar_url`
 * en su perfil. Devuelve una URL pública (DiceBear) generada a partir del
 * `user_id` (semilla estable → mismo avatar siempre para el mismo operador).
 *
 * - Si el perfil declara `gender = 'female'` se usa el set "lorelei"
 *   (estilizado, generalmente femenino).
 * - Si declara `gender = 'male'` se usa "adventurer-neutral" con paleta más
 *   sobria (rasgos típicamente masculinos).
 * - Si no hay género: usa "initials" — el operador queda representado por
 *   sus iniciales sobre fondo dorado, manteniendo la sobriedad de la marca.
 *
 * DiceBear es un CDN público (no requiere API key) y los SVG se cachean en
 * el navegador del visitante.
 */
export type OperatorGender = "male" | "female" | "other" | null | undefined;

const PRIMARY_HEX = "1a1a1a"; // negro marca
const GOLD_HEX = "C5A059"; // dorado marca

export function getOperatorAvatarUrl(opts: {
  userId: string | null | undefined;
  gender?: OperatorGender;
  displayName?: string | null;
}): string {
  const seed = encodeURIComponent(opts.userId || opts.displayName || "asesor");

  if (opts.gender === "female") {
    return `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundColor=${GOLD_HEX}&backgroundType=solid`;
  }
  if (opts.gender === "male") {
    return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${seed}&backgroundColor=${GOLD_HEX}&backgroundType=solid`;
  }
  // Sin género declarado → iniciales sobre fondo dorado (sobrio, brand-safe).
  const initialsSeed = (opts.displayName || "Asesor").trim();
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    initialsSeed,
  )}&backgroundColor=${GOLD_HEX}&fontFamily=Playfair%20Display&textColor=${PRIMARY_HEX}`;
}
