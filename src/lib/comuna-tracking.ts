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
  if (alreadyTrackedPV(slug)) return;
  try {
    await supabase.from("comuna_page_views").insert({
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

export async function trackComunaConversion(
  slug: string,
  nombre: string,
  eventType: ComunaConversionEvent,
  target?: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await supabase.from("comuna_conversion_events").insert({
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
