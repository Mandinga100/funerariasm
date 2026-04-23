import { supabase } from "@/integrations/supabase/client";

/**
 * Convierte un valor almacenado en `profiles.avatar_url` (que puede ser un path
 * relativo del bucket `avatars` o una URL pública antigua) en una URL firmada
 * temporal válida para mostrar la imagen en el cliente.
 *
 * Devuelve `null` si no hay foto o si no fue posible firmar.
 */
export async function signAvatarUrl(
  raw: string | null | undefined,
  expiresInSec = 3600
): Promise<string | null> {
  if (!raw) return null;

  // Extraer el path dentro del bucket `avatars`.
  // Acepta tanto paths puros (`<uid>/avatar-xxx.jpg`) como URLs históricas
  // que contienen `/object/public/avatars/<path>` o `/object/avatars/<path>`.
  let path = raw;
  const marker = "/avatars/";
  const idx = raw.indexOf(marker);
  if (idx !== -1) {
    path = raw.substring(idx + marker.length).split("?")[0];
  }

  if (!path || path.startsWith("http")) return null;

  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, expiresInSec);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Firma varios avatares en paralelo. Devuelve un mapa `path/url -> signedUrl`.
 */
export async function signAvatarUrls(
  rawUrls: Array<string | null | undefined>,
  expiresInSec = 3600
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(rawUrls.filter((u): u is string => !!u)));
  const entries = await Promise.all(
    unique.map(async (raw) => [raw, await signAvatarUrl(raw, expiresInSec)] as const)
  );
  const map: Record<string, string> = {};
  for (const [raw, signed] of entries) {
    if (signed) map[raw] = signed;
  }
  return map;
}
