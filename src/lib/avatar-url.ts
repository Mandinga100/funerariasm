import { supabase } from "@/integrations/supabase/client";

/**
 * Cache en memoria de signed URLs por sesión (proceso). Reduce llamadas
 * repetidas a `createSignedUrl` cuando varios componentes — o el mismo
 * componente al re-montar — solicitan el mismo avatar.
 *
 * Las entradas expiran un poco antes que el propio signed URL para evitar
 * servir uno ya inválido.
 */
type CacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, CacheEntry>();

/** Margen de seguridad: invalidamos el cache 60 s antes del vencimiento real. */
const SAFETY_MARGIN_MS = 60_000;

/** Promesas en vuelo para deduplicar llamadas concurrentes al mismo path. */
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Normaliza un valor almacenado en `profiles.avatar_url` (path o URL pública
 * antigua) al path real dentro del bucket `avatars`. Devuelve `null` si no
 * puede determinarse un path válido del bucket.
 */
function extractBucketPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const marker = "/avatars/";
  const idx = raw.indexOf(marker);
  if (idx !== -1) {
    const path = raw.substring(idx + marker.length).split("?")[0];
    return path || null;
  }
  // Si no contiene el marcador y parece URL externa, no podemos firmar.
  if (raw.startsWith("http")) return null;
  return raw;
}

/**
 * Convierte un valor almacenado en `profiles.avatar_url` (path relativo o URL
 * pública antigua) en una URL firmada temporal. Usa caché por sesión.
 *
 * @param raw          path o URL almacenada
 * @param expiresInSec duración solicitada al backend (default 1 h)
 */
export async function signAvatarUrl(
  raw: string | null | undefined,
  expiresInSec = 3600
): Promise<string | null> {
  const path = extractBucketPath(raw);
  if (!path) return null;

  const cacheKey = `${path}::${expiresInSec}`;
  const now = Date.now();

  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.url;

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, expiresInSec);
    if (error || !data?.signedUrl) return null;
    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: Date.now() + expiresInSec * 1000 - SAFETY_MARGIN_MS,
    });
    return data.signedUrl;
  })();

  inFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(cacheKey);
  }
}

/**
 * Firma varios avatares en paralelo. Devuelve un mapa `valorOriginal -> signedUrl`.
 * Aprovecha el caché compartido, así múltiples llamadas al mismo set son baratas.
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

/**
 * Invalida la entrada cacheada de un avatar específico. Útil tras subir una
 * nueva foto al mismo path (por ejemplo `upsert: true`).
 */
export function invalidateAvatarCache(raw: string | null | undefined): void {
  const path = extractBucketPath(raw);
  if (!path) return;
  for (const key of signedUrlCache.keys()) {
    if (key.startsWith(`${path}::`)) signedUrlCache.delete(key);
  }
}

/** Limpia todo el caché de avatares (p.ej. al cerrar sesión). */
export function clearAvatarCache(): void {
  signedUrlCache.clear();
  inFlight.clear();
}
