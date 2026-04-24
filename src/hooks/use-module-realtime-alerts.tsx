import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/use-notification-sound";

/**
 * Suscripción global a INSERTs en módulos con movimiento operativo:
 *  - service_cases (Casos)
 *  - agenda_events (Agenda)
 *  - blog_subscribers (Suscriptores)
 *  - family_tracking (Tracking)
 *  - payment_transactions (Pagos)
 *
 * Por cada nuevo registro:
 *  - 🔔 reproduce alerta sonora (urgente o normal)
 *  - 🪟 muestra toast con acción "Ver" que navega al módulo
 *  - Filtra registros previos al montaje (evita ruido en carga inicial)
 *
 * Pensado para montarse UNA vez en AdminLayout.
 */
export function useModuleRealtimeAlerts(opts: { enabled?: boolean } = {}) {
  const enabled = opts.enabled ?? true;
  const { toast } = useToast();
  const navigate = useNavigate();
  const { playNotification, playUrgentAlert } = useNotificationSound();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const mountedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const isFresh = (createdAt?: string | null): boolean => {
      if (!createdAt) return true;
      const t = new Date(createdAt).getTime();
      return t >= mountedAtRef.current - 5_000;
    };

    const wasSeen = (id?: string | null): boolean => {
      if (!id) return true;
      if (seenIdsRef.current.has(id)) return true;
      seenIdsRef.current.add(id);
      return false;
    };

    const buildAction = (route: string) => ({
      altText: "Ver",
      onClick: () => navigate(route),
      label: "Ver",
    });

    const suffix = Date.now();

    // ───── Casos ─────
    const casesChannel = supabase
      .channel(`alerts-cases-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "service_cases" },
        (payload) => {
          const row = payload.new as {
            id: string;
            case_number?: string | null;
            deceased_name?: string | null;
            client_name?: string | null;
            urgency?: string | null;
            comuna?: string | null;
            created_at?: string;
          };
          if (wasSeen(row.id) || !isFresh(row.created_at)) return;
          const isUrgent = row.urgency === "urgente";
          if (isUrgent) playUrgentAlert();
          else playNotification();
          const route = `/admin/casos?open=${row.id}`;
          toast({
            title: isUrgent
              ? `🚨 Caso URGENTE — ${row.case_number ?? "Nuevo"}`
              : `🗂️ Nuevo caso — ${row.case_number ?? "Nuevo"}`,
            description: `${row.deceased_name ?? row.client_name ?? "Sin nombre"}${row.comuna ? ` · ${row.comuna}` : ""}`,
            duration: isUrgent ? 20_000 : 8_000,
            action: (
              <button
                onClick={() => navigate(route)}
                className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Ver caso
              </button>
            ),
          });
        }
      )
      .subscribe();

    // ───── Agenda ─────
    const agendaChannel = supabase
      .channel(`alerts-agenda-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agenda_events" },
        (payload) => {
          const row = payload.new as {
            id: string;
            title?: string | null;
            event_type?: string | null;
            priority?: string | null;
            start_at?: string | null;
            created_at?: string;
          };
          if (wasSeen(row.id) || !isFresh(row.created_at)) return;
          const isUrgent = row.priority === "critica" || row.priority === "alta";
          if (isUrgent) playUrgentAlert();
          else playNotification();
          const route = `/admin/agenda?event=${row.id}`;
          const when = row.start_at
            ? new Date(row.start_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })
            : "Sin fecha";
          toast({
            title: isUrgent ? `📅 Evento prioritario — ${row.title ?? "Nuevo"}` : `📅 Nuevo evento — ${row.title ?? "Sin título"}`,
            description: `${when}${row.event_type ? ` · ${row.event_type}` : ""}`,
            duration: isUrgent ? 15_000 : 7_000,
            action: (
              <button
                onClick={() => navigate(route)}
                className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Ver agenda
              </button>
            ),
          });
        }
      )
      .subscribe();

    // ───── Suscriptores ─────
    const subsChannel = supabase
      .channel(`alerts-subs-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blog_subscribers" },
        (payload) => {
          const row = payload.new as {
            id: string;
            email?: string | null;
            source?: string | null;
            subscribed_at?: string;
          };
          if (wasSeen(row.id) || !isFresh(row.subscribed_at)) return;
          playNotification();
          toast({
            title: `✉️ Nuevo suscriptor`,
            description: `${row.email ?? "Sin email"}${row.source ? ` · ${row.source}` : ""}`,
            duration: 6_000,
            action: (
              <button
                onClick={() => navigate("/admin/suscriptores")}
                className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Ver lista
              </button>
            ),
          });
        }
      )
      .subscribe();

    // ───── Tracking familiar ─────
    const trackingChannel = supabase
      .channel(`alerts-tracking-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "family_tracking" },
        (payload) => {
          const row = payload.new as {
            id: string;
            family_name?: string | null;
            family_code?: string | null;
            assigned_at?: string;
            auto_created_from?: string | null;
          };
          if (wasSeen(row.id) || !isFresh(row.assigned_at)) return;
          playNotification();
          toast({
            title: `👪 Nuevo tracking familiar`,
            description: `${row.family_name ?? "Sin nombre"} · Código ${row.family_code ?? "—"}${row.auto_created_from ? ` · ${row.auto_created_from}` : ""}`,
            duration: 7_000,
            action: (
              <button
                onClick={() => navigate("/admin/tracking")}
                className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Ver tracking
              </button>
            ),
          });
        }
      )
      .subscribe();

    // ───── Pagos ─────
    const paymentsChannel = supabase
      .channel(`alerts-payments-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payment_transactions" },
        (payload) => {
          const row = payload.new as {
            id: string;
            full_name?: string | null;
            amount?: number | null;
            currency?: string | null;
            payment_type?: string | null;
            status?: string | null;
            created_at?: string;
          };
          if (wasSeen(row.id) || !isFresh(row.created_at)) return;
          playNotification();
          const formatted = typeof row.amount === "number"
            ? new Intl.NumberFormat("es-CL", { style: "currency", currency: row.currency || "CLP", maximumFractionDigits: 0 }).format(row.amount)
            : "—";
          toast({
            title: `💰 Nuevo pago — ${formatted}`,
            description: `${row.full_name ?? "Sin nombre"}${row.payment_type ? ` · ${row.payment_type}` : ""}${row.status ? ` · ${row.status}` : ""}`,
            duration: 9_000,
            action: (
              <button
                onClick={() => navigate(`/admin/pagos?open=${row.id}`)}
                className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Ver pago
              </button>
            ),
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(casesChannel);
      void supabase.removeChannel(agendaChannel);
      void supabase.removeChannel(subsChannel);
      void supabase.removeChannel(trackingChannel);
      void supabase.removeChannel(paymentsChannel);
    };
  }, [enabled, toast, navigate, playNotification, playUrgentAlert]);
}
