/**
 * Sistema de tracking propio para landing pages de comuna.
 * - Privacidad: sin cookies de terceros, session_id efímero en sessionStorage.
 * - Resiliente: errores nunca bloquean la UI ni rompen la navegación.
 * - Anti-doble-conteo: dedupe de pageview por slug + sesión.
 */
import { supabase } from "@/integrations/supabase/client";

export type ComunaConversionEvent =
  | "cta_call"
  | "cta_whatsapp"
  | "view_planes"
  | "navigate_vecina";

const SESSION_KEY = "comuna_tracking_sid";
const PV_DEDUPE_KEY = "comuna_tracking_pv";
const ATTRIBUTION_KEY = "comuna_tracking_attr";

/** Datos de atribución que viajan con cada lead nuevo. */
export interface ComunaAttribution {
  comuna_slug: string;
  comuna_nombre: string;
  landing_path: string;
  first_seen_at: string;
  last_seen_at: string;
  visit_count: number;
  session_id: string;
  referrer: string | null;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "no-storage";
  }
}

function alreadyTrackedPV(slug: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = sessionStorage.getItem(PV_DEDUPE_KEY);
    const set = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    if (set.has(slug)) return true;
    set.add(slug);
    sessionStorage.setItem(PV_DEDUPE_KEY, JSON.stringify(Array.from(set)));
    return false;
  } catch {
    return false;
  }
}

export async function trackComunaPageView(slug: string, nombre: string): Promise<void> {
  if (typeof window === "undefined") return;
  // Persiste atribución (incluso si ya fue contado el pageview en esta sesión,
  // queremos refrescar last_seen_at e incrementar visit_count).
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    const prev: ComunaAttribution | null = raw ? JSON.parse(raw) : null;
    const now = new Date().toISOString();
    const next: ComunaAttribution = {
      comuna_slug: slug,
      comuna_nombre: nombre,
      landing_path: window.location.pathname,
      first_seen_at: prev && prev.comuna_slug === slug ? prev.first_seen_at : now,
      last_seen_at: now,
      visit_count: prev && prev.comuna_slug === slug ? prev.visit_count + 1 : 1,
      session_id: getSessionId(),
      referrer: document.referrer || prev?.referrer || null,
    };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    // Silencioso
  }

  if (alreadyTrackedPV(slug)) return;
  try {
    // Cast: tipos generados de Supabase aún no incluyen estas tablas recién creadas.
    await (supabase.from as any)("comuna_page_views").insert({
      comuna_slug: slug,
      comuna_nombre: nombre,
      session_id: getSessionId(),
      referrer: document.referrer || null,
      user_agent: navigator.userAgent.slice(0, 500),
      pathname: window.location.pathname,
    });
  } catch {
    // Silencioso por diseño: tracking nunca debe romper la experiencia.
  }
}

/**
 * Devuelve la atribución de comuna almacenada en la sesión actual,
 * o null si el visitante no pasó por una landing /funeraria/:comuna.
 */
export function getComunaAttribution(): ComunaAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as ComunaAttribution) : null;
  } catch {
    return null;
  }
}

export async function trackComunaConversion(
  slug: string,
  nombre: string,
  eventType: ComunaConversionEvent,
  target?: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await (supabase.from as any)("comuna_conversion_events").insert({
      comuna_slug: slug,
      comuna_nombre: nombre,
      event_type: eventType,
      target: target ?? null,
      session_id: getSessionId(),
      user_agent: navigator.userAgent.slice(0, 500),
      pathname: window.location.pathname,
      metadata,
    });
  } catch {
    // Silencioso
  }
}
