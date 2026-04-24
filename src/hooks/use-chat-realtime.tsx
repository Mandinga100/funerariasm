import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/use-notification-sound";

/**
 * Suscripción global a chat_conversations para alertar handoff bot→humano
 * y mensajes en convos asignadas o sin asignar. Se monta una sola vez en AdminLayout.
 */
export function useChatRealtimeAlerts({ enabled }: { enabled: boolean }) {
  const { toast } = useToast();
  const { playUrgentAlert } = useNotificationSound();

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("chat-handoff-global")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_conversations" },
        (payload) => {
          const next = payload.new as { status?: string; priority?: string; visitor_name?: string | null };
          const prev = payload.old as { status?: string };
          if (next.status === "pendiente_humano" && prev.status !== "pendiente_humano") {
            toast({
              title: "💬 Visitante solicita asesor",
              description: `${next.visitor_name ?? "Visitante"} espera respuesta humana`,
              duration: 12000,
            });
            if (next.priority === "urgente" || next.priority === "alta") {
              playUrgentAlert();
            }
          }
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [enabled, toast, playUrgentAlert]);
}
