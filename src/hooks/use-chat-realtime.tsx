import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/use-notification-sound";

/**
 * Suscripción global a chat_conversations + chat_messages para alertar:
 *  - Handoff bot→humano (visitante solicita asesor).
 *  - Cada mensaje del visitante en una conversación que aún no tiene asesor
 *    asignado o que ya tomó otro ejecutivo (toast clickeable que lleva
 *    directamente a /admin/chat?conversation=ID para tomar control).
 *
 * Se monta una sola vez en AdminLayout.
 */
export function useChatRealtimeAlerts({ enabled }: { enabled: boolean }) {
  const { toast } = useToast();
  const { playUrgentAlert, playNotification } = useNotificationSound();
  const navigate = useNavigate();
  const mountedAtRef = useRef<number>(Date.now());
  const seenMsgIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    // Canal 1: cambios de estado de la conversación (handoff).
    const convoChannel = supabase
      .channel("chat-handoff-global")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_conversations" },
        (payload) => {
          const next = payload.new as {
            id?: string;
            status?: string;
            priority?: string;
            visitor_name?: string | null;
          };
          const prev = payload.old as { status?: string };
          if (next.status === "pendiente_humano" && prev.status !== "pendiente_humano" && next.id) {
            const convoId = next.id;
            toast({
              title: "💬 Visitante solicita asesor",
              description: `${next.visitor_name ?? "Visitante"} espera respuesta humana — toca para tomar control`,
              duration: 14000,
              onClick: () => navigate(`/admin/chat?conversation=${convoId}`),
              className: "cursor-pointer",
            });
            if (next.priority === "urgente" || next.priority === "alta") {
              playUrgentAlert();
            }
          }
        },
      )
      .subscribe();

    // Canal 2: mensajes nuevos del visitante. Cada mensaje genera un toast
    // clickable hacia la conversación, salvo que ya esté abierta en pantalla.
    const msgChannel = supabase
      .channel("chat-visitor-messages-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const msg = payload.new as {
            id?: string;
            conversation_id?: string;
            sender_type?: string;
            content?: string;
            created_at?: string;
            is_internal_note?: boolean;
          };
          if (!msg?.id || !msg.conversation_id) return;
          if (msg.sender_type !== "visitor") return;
          if (msg.is_internal_note) return;
          if (seenMsgIdsRef.current.has(msg.id)) return;
          seenMsgIdsRef.current.add(msg.id);

          // Ignorar mensajes anteriores al montaje (carga inicial).
          if (msg.created_at && new Date(msg.created_at).getTime() < mountedAtRef.current - 5000) return;

          // Si ya estamos viendo esa conversación, no toasteamos.
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            const currentConvo = url.searchParams.get("conversation");
            if (url.pathname.startsWith("/admin/chat") && currentConvo === msg.conversation_id) return;
          }

          // Buscar nombre/visitante para el toast.
          const { data: convo } = await supabase
            .from("chat_conversations")
            .select("visitor_name, visitor_phone, status, assigned_to, priority")
            .eq("id", msg.conversation_id)
            .maybeSingle();

          const name = convo?.visitor_name?.trim() || convo?.visitor_phone || "Visitante";
          const isUrgent = convo?.priority === "urgente" || convo?.priority === "alta";
          const convoId = msg.conversation_id;
          const cta = convo?.assigned_to ? "Ver conversación" : "Tomar control";
          const content = (msg.content ?? "").slice(0, 120);

          // Filtrar mensajes "[Sistema]" generados por el propio chatbox
          // (cierre / vuelta a menú) — los mostramos con título distinto.
          const isVisitorSystem = content.startsWith("[Sistema]");

          toast({
            title: isVisitorSystem
              ? `ℹ️ ${name} — actualización`
              : `💬 ${name} — nuevo mensaje`,
            description: `${content} · ${cta}`,
            duration: isUrgent ? 14000 : 9000,
            onClick: () => navigate(`/admin/chat?conversation=${convoId}`),
            className: "cursor-pointer",
          });
          if (isUrgent) playUrgentAlert();
          else playNotification();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(convoChannel);
      void supabase.removeChannel(msgChannel);
    };
  }, [enabled, toast, playUrgentAlert, playNotification, navigate]);
}
