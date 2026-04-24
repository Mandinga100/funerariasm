import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageThread } from "./MessageThread";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  /** Filter conversations linked to this lead. */
  leadId?: string;
  /** Filter conversations linked to this service case. */
  serviceCaseId?: string;
  /** When true, renders a more compact frame for embedding in sheets/tabs. */
  compact?: boolean;
}

interface ConvoRow {
  id: string;
  status: string;
  priority: string;
  unread_admin: number;
  last_message_at: string;
  visitor_name: string | null;
  visitor_phone: string | null;
}

/**
 * Reusable panel that finds chat conversations linked to a lead or service case
 * and renders the thread inline. Used in LeadDetailSheet and CaseDetailSheet.
 */
export function LinkedChatPanel({ leadId, serviceCaseId, compact = false }: Props) {
  const [convos, setConvos] = useState<ConvoRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId && !serviceCaseId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      let q = supabase
        .from("chat_conversations")
        .select("id, status, priority, unread_admin, last_message_at, visitor_name, visitor_phone")
        .order("last_message_at", { ascending: false });

      if (serviceCaseId) q = q.eq("service_case_id", serviceCaseId);
      else if (leadId) q = q.eq("lead_id", leadId);

      const { data } = await q;
      if (cancelled) return;
      const rows = (data ?? []) as ConvoRow[];
      // Relevance: open > pending handoff > unread > most recent.
      // Closed conversations always sort last so the panel highlights live work first.
      const statusRank: Record<string, number> = {
        humano_activo: 0,
        pendiente_humano: 1,
        bot: 2,
        cerrado: 3,
      };
      const priorityRank: Record<string, number> = {
        urgente: 0,
        alta: 1,
        normal: 2,
        baja: 3,
      };
      const sorted = [...rows].sort((a, b) => {
        const sa = statusRank[a.status] ?? 9;
        const sb = statusRank[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        if ((b.unread_admin ?? 0) !== (a.unread_admin ?? 0)) {
          return (b.unread_admin ?? 0) - (a.unread_admin ?? 0);
        }
        const pa = priorityRank[a.priority] ?? 9;
        const pb = priorityRank[b.priority] ?? 9;
        if (pa !== pb) return pa - pb;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
      setConvos(sorted);
      setActiveId(sorted[0]?.id ?? null);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [leadId, serviceCaseId]);

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground p-4 text-center">
        Cargando conversaciones…
      </div>
    );
  }

  if (convos.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center space-y-2">
        <MessageSquare className="w-6 h-6 mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Sin conversaciones de chat vinculadas todavía.
        </p>
        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
          <Link to="/admin/chat">
            <ExternalLink className="w-3 h-3 mr-1" />Abrir bandeja de chat
          </Link>
        </Button>
      </div>
    );
  }

  const active = convos.find((c) => c.id === activeId) ?? convos[0];

  return (
    <div className="space-y-2">
      {convos.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {convos.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                c.id === activeId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-input"
              }`}
            >
              {c.visitor_name || c.visitor_phone || "Visitante"}
              {c.unread_admin > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                  {c.unread_admin}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-4 px-1 text-[10px] capitalize">{active.status.replace("_", " ")}</Badge>
          <span>·</span>
          <span>Última actividad {formatDistanceToNow(new Date(active.last_message_at), { addSuffix: true, locale: es })}</span>
        </div>
        <Button asChild size="sm" variant="ghost" className="h-6 text-[10px] px-2">
          <Link to={`/admin/chat?conversation=${active.id}`}>
            Bandeja completa
          </Link>
        </Button>
      </div>

      <div className={`rounded-md border overflow-hidden ${compact ? "h-[420px]" : "h-[520px]"}`}>
        <MessageThread conversationId={active.id} />
      </div>
    </div>
  );
}
