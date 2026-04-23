import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { getLeadCategory } from "@/lib/crm-tokens";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";

interface LeadRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  urgency: string | null;
  contact_type: string;
  message: string | null;
  selected_plan: string | null;
  created_at: string;
}

/**
 * Suscripción global a leads nuevos en el CRM.
 * Cuando entra un lead:
 *  - 🔔 reproduce alerta sonora (urgente o normal)
 *  - 🪟 muestra toast con acciones (WhatsApp Business + Ver lead)
 *  - 📬 dispara fanout a admin_notifications via trigger DB (ya configurado)
 *
 * Pensado para montarse UNA vez en AdminLayout — escucha todo INSERT en contact_leads.
 */
export function useLeadRealtimeAlerts(opts: { enabled?: boolean } = {}) {
  const enabled = opts.enabled ?? true;
  const { toast } = useToast();
  const { playNotification, playUrgentAlert } = useNotificationSound();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const mountedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`lead-alerts-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contact_leads" },
        (payload) => {
          const lead = payload.new as LeadRow;
          if (!lead?.id) return;

          // Evita duplicados (realtime puede repetir bajo reconexión)
          if (seenIdsRef.current.has(lead.id)) return;
          seenIdsRef.current.add(lead.id);

          // Ignora leads creados ANTES de montar (carga inicial de history)
          const createdAt = new Date(lead.created_at).getTime();
          if (createdAt < mountedAtRef.current - 5_000) return;

          const category = getLeadCategory(lead.urgency);
          const isUrgent = category === "urgencia";

          // Sonido
          if (isUrgent) playUrgentAlert();
          else playNotification();

          // Toast con acciones
          const displayName = lead.name?.trim() || "Sin nombre";
          const displayPhone = lead.phone || "Sin teléfono";

          const wppMsg = `Hola ${displayName}, le contactamos desde Funeraria Santa Margarita por su consulta reciente. ¿En qué podemos ayudarle?`;
          const wppUrl = lead.phone
            ? `https://wa.me/${lead.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(wppMsg)}`
            : buildWhatsAppUrlDirect(wppMsg);

          toast({
            title: isUrgent
              ? `🚨 Lead URGENTE — ${displayName}`
              : category === "prevision"
              ? `🌿 Nueva previsión — ${displayName}`
              : `💰 Nueva cotización — ${displayName}`,
            description: `${displayPhone} · ${lead.contact_type}${
              lead.selected_plan ? ` · ${lead.selected_plan}` : ""
            }`,
            duration: isUrgent ? 20_000 : 8_000,
            action: lead.phone ? (
              <a
                href={wppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                💬 WhatsApp
              </a>
            ) : undefined,
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, toast, playNotification, playUrgentAlert]);
}
