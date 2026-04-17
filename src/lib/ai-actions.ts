/**
 * Helpers para integrar acciones IA con el catálogo `ai_action_settings`.
 * - `fetchAiActionSettings`: lee el catálogo completo (cacheado en memoria 60s).
 * - `getAiActionSetting`: lee la config de UNA acción por su `action_key`.
 * - `recordAiInvocation`: registra una invocación en `ai_action_invocations`
 *   con el costo estimado del catálogo. Falla silenciosa: tracking nunca rompe la UI.
 * - `confirmDisabledAction`: muestra un confirm si la acción está apagada
 *   por política, retorna true si el usuario decide ejecutarla igualmente.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AiActionSetting {
  id: string;
  action_key: string;
  module: string;
  display_name: string;
  description: string;
  estimated_cost_usd: number;
  enabled: boolean;
  model: string | null;
  updated_at: string;
}

let cache: { at: number; data: AiActionSetting[] } | null = null;
const CACHE_MS = 60_000;

export async function fetchAiActionSettings(force = false): Promise<AiActionSetting[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const { data, error } = await (supabase.from as any)("ai_action_settings")
    .select("*")
    .order("module", { ascending: true })
    .order("display_name", { ascending: true });
  if (error || !data) return cache?.data ?? [];
  const typed = data as AiActionSetting[];
  cache = { at: Date.now(), data: typed };
  return typed;
}

export function invalidateAiActionSettingsCache() {
  cache = null;
}

export async function getAiActionSetting(actionKey: string): Promise<AiActionSetting | null> {
  const all = await fetchAiActionSettings();
  return all.find((s) => s.action_key === actionKey) ?? null;
}

export async function recordAiInvocation(
  actionKey: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const setting = await getAiActionSetting(actionKey);
    const { data: auth } = await supabase.auth.getUser();
    await (supabase.from as any)("ai_action_invocations").insert({
      action_key: actionKey,
      user_id: auth.user?.id ?? null,
      estimated_cost_usd: setting?.estimated_cost_usd ?? 0,
      metadata,
    });
  } catch {
    // silencioso
  }
}

/**
 * Si la acción está deshabilitada en /admin/ajustes/ia, pide confirmación.
 * Retorna `true` si el usuario decide ejecutar igualmente, `false` si cancela.
 * Si está habilitada o no se encuentra, retorna `true` directamente.
 */
export async function confirmDisabledAction(actionKey: string): Promise<boolean> {
  const setting = await getAiActionSetting(actionKey);
  if (!setting || setting.enabled) return true;
  if (typeof window === "undefined") return true;
  return window.confirm(
    `⚠️ La acción "${setting.display_name}" está marcada como DESACTIVADA por política en Ajustes › IA.\n\n¿Desea ejecutarla de todas formas?`,
  );
}
