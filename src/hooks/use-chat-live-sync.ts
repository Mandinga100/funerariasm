/**
 * Sincronización en tiempo real entre el chatbox web del visitante y el CRM.
 *
 * Hace polling ligero a la edge function `chat-public-poll` (3s cuando el chat
 * está abierto, 8s cuando está minimizado/cerrado) para:
 *  - Hidratar el historial completo de la conversación al primer tick (incluye
 *    mensajes del visitante) — así, si cerró por accidente o recargó, al
 *    reabrir ve todo lo conversado, no solo el greeting.
 *  - Recibir mensajes del operador (sender_type = admin) y del sistema
 *    (handoff: "X se ha unido a la conversación...") en los siguientes ticks.
 *  - Detectar cuando un operador toma control (status = humano_activo) y
 *    mostrar su nombre en el header del chatbox.
 *  - Notificar mensajes nuevos cuando el chat está minimizado para que el
 *    botón flotante muestre badge.
 *
 * No requiere RLS pública: la edge usa service-role y filtra por token.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateChatToken } from "@/lib/chat-token";

export type SenderType = "visitor" | "admin" | "bot" | "system";

export interface InboundMessage {
  id: string;
  sender_type: SenderType;
  content: string;
  created_at: string;
}

export interface ChatLiveState {
  /** Mensajes nuevos recibidos en este tick incremental (no incluye historial). */
  newMessages: InboundMessage[];
  /**
   * Snapshot completo del historial recibido en la PRIMERA hidratación
   * (incluye mensajes del visitante). Solo se setea una vez por sesión del hook.
   */
  history: InboundMessage[] | null;
  /** True cuando ya recibimos al menos una respuesta del servidor. */
  hydrated: boolean;
  /** Estado del lado CRM. */
  status: "bot" | "pendiente_humano" | "humano_activo" | "cerrado" | null;
  operatorName: string | null;
  operatorActive: boolean;
  closed: boolean;
  /** Total de mensajes admin/system no vistos (mientras chat está cerrado). */
  unseenCount: number;
  /** Resetea unseenCount cuando el visitante abre el chat. */
  markSeen: () => void;
}

interface Options {
  /** Si el chat está visible y el visitante está mirando. */
  visible: boolean;
  /** Callback en cada nuevo lote de mensajes inbound (admin/system/bot). */
  onInbound?: (msgs: InboundMessage[]) => void;
}

export function useChatLiveSync({ visible, onInbound }: Options): ChatLiveState {
  const [status, setStatus] = useState<ChatLiveState["status"]>(null);
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const [operatorActive, setOperatorActive] = useState(false);
  const [closed, setClosed] = useState(false);
  const [newMessages, setNewMessages] = useState<InboundMessage[]>([]);
  const [history, setHistory] = useState<InboundMessage[] | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);

  // `since` controla qué pedir: null en la 1a llamada (hidratación = todo el
  // historial), luego se actualiza al timestamp del último mensaje conocido.
  const sinceRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const onInboundRef = useRef(onInbound);
  useEffect(() => { onInboundRef.current = onInbound; }, [onInbound]);

  const markSeen = useCallback(() => setUnseenCount(0), []);

  const tick = useCallback(async () => {
    const token = getOrCreateChatToken();
    try {
      const { data, error } = await supabase.functions.invoke("chat-public-poll", {
        body: {
          conversation_token: token,
          since: sinceRef.current ?? undefined,
          mark_read: visible,
        },
      });
      if (error || !data || (data as { ok?: boolean }).ok !== true) return;
      const payload = data as {
        exists: boolean;
        status: ChatLiveState["status"];
        operator_name: string | null;
        operator_active: boolean;
        closed: boolean;
        hydration?: boolean;
        messages: InboundMessage[];
      };
      setHydrated(true);
      if (!payload.exists) return;

      setStatus(payload.status);
      setOperatorName(payload.operator_name);
      setOperatorActive(payload.operator_active);
      setClosed(payload.closed);

      const all = payload.messages ?? [];

      // Hidratación: primera llamada con `since=null`. Devuelve TODO el
      // historial (incluye visitor). Lo exponemos como `history` para que el
      // chatbox lo pinte completo al reabrir.
      if (payload.hydration) {
        all.forEach((m) => seenIdsRef.current.add(m.id));
        if (all.length > 0) {
          sinceRef.current = all[all.length - 1].created_at;
        }
        setHistory(all);
        // No emitimos onInbound durante la hidratación: el chatbox usa
        // `history` para reconstruir el panel y evita duplicar burbujas.
        return;
      }

      // Polling incremental: solo inbound (admin/system/bot) nuevos.
      const fresh = all.filter((m) => !seenIdsRef.current.has(m.id));
      if (fresh.length > 0) {
        fresh.forEach((m) => seenIdsRef.current.add(m.id));
        sinceRef.current = fresh[fresh.length - 1].created_at;
        setNewMessages(fresh);
        if (!visible) setUnseenCount((c) => c + fresh.length);
        onInboundRef.current?.(fresh);
      }
    } catch {
      /* swallow: polling es best-effort */
    }
  }, [visible]);

  useEffect(() => {
    // Tick inmediato al montar/cambiar visibilidad y luego intervalo.
    void tick();
    const intervalMs = visible ? 3000 : 8000;
    const id = window.setInterval(() => { void tick(); }, intervalMs);
    return () => window.clearInterval(id);
  }, [tick, visible]);

  return {
    newMessages,
    history,
    hydrated,
    status,
    operatorName,
    operatorActive,
    closed,
    unseenCount,
    markSeen,
  };
}
