/**
 * Presencia de operadores del CRM.
 *
 * Mantiene un heartbeat en `operator_presence` mientras el ejecutivo está en
 * el panel. Sirve para:
 *  - Mostrar quiénes están "Online" y reasignar conversaciones a ellos.
 *  - Medir tiempo conectado (sumamos los segundos de cada sesión cerrada al
 *    cambiar a offline o al perder la pestaña).
 *
 * Reglas:
 *  - Online manual: el usuario clickea el toggle. Marca status='online' y
 *    abre `session_started_at`.
 *  - Heartbeat: cada 30s actualizamos `last_seen_at` y `current_session_seconds`.
 *  - Offline manual o cierre de pestaña: cerramos la sesión sumando los
 *    segundos al `total_online_seconds`.
 *  - Auto-stale: cualquier fila con `last_seen_at` > 90s sin update se
 *    considera offline en el listado (no requiere update server-side).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const HEARTBEAT_MS = 30_000;
const STALE_THRESHOLD_MS = 90_000;

export type PresenceStatus = "online" | "offline" | "busy" | "away";

export interface PresenceRow {
  user_id: string;
  status: PresenceStatus;
  last_seen_at: string;
  session_started_at: string | null;
  total_online_seconds: number;
  current_session_seconds: number;
}

export interface OnlineOperator {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  gender: "male" | "female" | "other" | null;
  status: PresenceStatus;
  current_session_seconds: number;
  total_online_seconds: number;
}

/** Hook para el operador actual: controla su propio estado online/offline. */
export function useMyPresence() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PresenceStatus>("offline");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const sessionStartRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cargar estado inicial
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("operator_presence")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setStatus(data.status as PresenceStatus);
        setTotalSeconds(Number(data.total_online_seconds ?? 0));
        if (data.status === "online" && data.session_started_at) {
          sessionStartRef.current = new Date(data.session_started_at).getTime();
          setSessionSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const writePresence = useCallback(
    async (next: PresenceStatus, sessionStart: number | null) => {
      if (!user?.id) return;
      const now = new Date().toISOString();
      const sessionStartedAt = sessionStart ? new Date(sessionStart).toISOString() : null;
      const sessionElapsed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
      await supabase.from("operator_presence").upsert(
        {
          user_id: user.id,
          status: next,
          last_seen_at: now,
          session_started_at: next === "online" ? sessionStartedAt : null,
          current_session_seconds: next === "online" ? sessionElapsed : 0,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );
    },
    [user?.id],
  );

  const goOnline = useCallback(async () => {
    if (!user?.id) return;
    const start = Date.now();
    sessionStartRef.current = start;
    setSessionSeconds(0);
    setStatus("online");
    await writePresence("online", start);
  }, [user?.id, writePresence]);

  const goOffline = useCallback(async () => {
    if (!user?.id) return;
    const start = sessionStartRef.current;
    const elapsed = start ? Math.floor((Date.now() - start) / 1000) : 0;
    sessionStartRef.current = null;
    setSessionSeconds(0);
    setStatus("offline");
    setTotalSeconds((prev) => prev + elapsed);
    // RPC equivalent via direct update: incrementar total y limpiar sesión.
    if (elapsed > 0) {
      const { data: cur } = await supabase
        .from("operator_presence")
        .select("total_online_seconds")
        .eq("user_id", user.id)
        .maybeSingle();
      const base = Number(cur?.total_online_seconds ?? 0);
      await supabase.from("operator_presence").upsert(
        {
          user_id: user.id,
          status: "offline",
          last_seen_at: new Date().toISOString(),
          session_started_at: null,
          current_session_seconds: 0,
          total_online_seconds: base + elapsed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } else {
      await writePresence("offline", null);
    }
  }, [user?.id, writePresence]);

  const toggle = useCallback(async () => {
    if (status === "online") return goOffline();
    return goOnline();
  }, [status, goOnline, goOffline]);

  // Heartbeat + ticker de UI
  useEffect(() => {
    if (status !== "online" || !user?.id) {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
      return;
    }
    // Tick visible cada 1s para el contador
    tickerRef.current = setInterval(() => {
      if (sessionStartRef.current) {
        setSessionSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      }
    }, 1000);
    // Heartbeat de DB cada 30s
    heartbeatRef.current = setInterval(() => {
      void writePresence("online", sessionStartRef.current);
    }, HEARTBEAT_MS);

    return () => {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
    };
  }, [status, user?.id, writePresence]);

  // Cierre de pestaña → marcamos offline (best-effort, sin esperar respuesta)
  useEffect(() => {
    const handler = () => {
      if (status === "online") {
        // No usamos await: solo intentamos despachar el update.
        void goOffline();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status, goOffline]);

  return { status, sessionSeconds, totalSeconds, toggle, goOnline, goOffline };
}

/** Hook para listar operadores online (filtra stale automáticamente). */
export function useOnlineOperators(): OnlineOperator[] {
  const [rows, setRows] = useState<OnlineOperator[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: presence } = await supabase
        .from("operator_presence")
        .select("user_id,status,last_seen_at,current_session_seconds,total_online_seconds")
        .eq("status", "online");
      if (!presence || presence.length === 0) {
        if (!cancelled) setRows([]);
        return;
      }
      const fresh = presence.filter(
        (p) => Date.now() - new Date(p.last_seen_at).getTime() < STALE_THRESHOLD_MS,
      );
      const ids = fresh.map((p) => p.user_id);
      if (ids.length === 0) {
        if (!cancelled) setRows([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name,avatar_url,gender")
        .in("user_id", ids);
      const profMap = new Map((profs ?? []).map((p) => [p.user_id, p]));
      const merged: OnlineOperator[] = fresh.map((p) => {
        const prof = profMap.get(p.user_id);
        return {
          user_id: p.user_id,
          display_name: prof?.display_name ?? null,
          avatar_url: prof?.avatar_url ?? null,
          gender: (prof?.gender as OnlineOperator["gender"]) ?? null,
          status: p.status as PresenceStatus,
          current_session_seconds: Number(p.current_session_seconds ?? 0),
          total_online_seconds: Number(p.total_online_seconds ?? 0),
        };
      });
      if (!cancelled) setRows(merged);
    };
    void load();
    const channel = supabase
      .channel("operator-presence-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "operator_presence" }, () => void load())
      .subscribe();
    const refreshInterval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(refreshInterval); void supabase.removeChannel(channel); };
  }, []);

  return rows;
}

export function formatPresenceDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}
