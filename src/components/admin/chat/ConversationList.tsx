import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, Trash2, Info } from "lucide-react";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";

export interface ConversationRow {
  id: string;
  conversation_token: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  visitor_email: string | null;
  status: "bot" | "pendiente_humano" | "humano_activo" | "cerrado";
  priority: "baja" | "normal" | "alta" | "urgente";
  assigned_to: string | null;
  unread_admin: number;
  sla_due_at: string | null;
  last_message_at: string;
  closed_at: string | null;
  lead_id: string | null;
  service_case_id: string | null;
}

const CLOSED_RETENTION_DAYS = 7;
const CLOSED_RETENTION_MS = CLOSED_RETENTION_DAYS * 24 * 60 * 60 * 1000;

type Filter = "todas" | "sin_asignar" | "mias" | "urgentes" | "cerradas";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusLabel: Record<ConversationRow["status"], string> = {
  bot: "Bot",
  pendiente_humano: "Esperando",
  humano_activo: "Activa",
  cerrado: "Cerrada",
};

const statusClass: Record<ConversationRow["status"], string> = {
  bot: "bg-muted text-muted-foreground",
  pendiente_humano: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  humano_activo: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
  cerrado: "bg-muted text-muted-foreground",
};

const priorityDot: Record<ConversationRow["priority"], string> = {
  baja: "bg-muted-foreground/40",
  normal: "bg-blue-500",
  alta: "bg-orange-500",
  urgente: "bg-red-500 animate-pulse",
};

export function ConversationList({ selectedId, onSelect }: Props) {
  const { user, isAdmin, isCeo } = useAuth();
  const { toast } = useToast();
  const canDelete = isAdmin || isCeo;
  const [convos, setConvos] = useState<ConversationRow[]>([]);
  const [filter, setFilter] = useState<Filter>("todas");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ConversationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load + realtime
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, conversation_token, visitor_name, visitor_phone, visitor_email, status, priority, assigned_to, unread_admin, sla_due_at, last_message_at, closed_at, lead_id, service_case_id")
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setConvos((data ?? []) as ConversationRow[]);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel("chat-list-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, (payload) => {
        setConvos((prev) => {
          if (payload.eventType === "INSERT") {
            return [payload.new as ConversationRow, ...prev];
          }
          if (payload.eventType === "UPDATE") {
            const next = payload.new as ConversationRow;
            return prev
              .map((c) => (c.id === next.id ? next : c))
              .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((c) => c.id !== (payload.old as { id: string }).id);
          }
          return prev;
        });
      })
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - CLOSED_RETENTION_MS;
    return convos.filter((c) => {
      // Cerradas: solo visibles si fueron cerradas hace ≤ 7 días
      if (c.status === "cerrado") {
        const closedTs = c.closed_at ? new Date(c.closed_at).getTime() : new Date(c.last_message_at).getTime();
        if (closedTs < cutoff) return false;
      }
      if (filter === "sin_asignar" && c.assigned_to) return false;
      if (filter === "mias" && c.assigned_to !== user?.id) return false;
      if (filter === "urgentes" && c.priority !== "urgente" && c.priority !== "alta") return false;
      if (filter === "cerradas" && c.status !== "cerrado") return false;
      if (filter !== "cerradas" && c.status === "cerrado") return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${c.visitor_name ?? ""} ${c.visitor_phone ?? ""} ${c.visitor_email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [convos, filter, search, user?.id]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    // Borrar mensajes primero (no hay FK cascade declarado)
    const { error: msgErr } = await supabase
      .from("chat_messages")
      .delete()
      .eq("conversation_id", deleteTarget.id);
    if (msgErr) {
      toast({ title: "No se pudo eliminar", description: msgErr.message, variant: "destructive" });
      setDeleting(false);
      return;
    }
    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
      return;
    }
    setConvos((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    toast({ title: "Conversación eliminada", description: "Se borraron los mensajes y el registro." });
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar visitante…" className="h-8 pl-8 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1">
          {([
            ["todas","Todas"],
            ["sin_asignar","Sin asignar"],
            ["mias","Mías"],
            ["urgentes","Urgentes"],
            ["cerradas","Cerradas"],
          ] as [Filter,string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                filter === k ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filter === "cerradas" && (
        <div className="mx-3 mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Las conversaciones cerradas se conservan <strong>{CLOSED_RETENTION_DAYS} días</strong> y luego se eliminan automáticamente.
            {canDelete && " Puedes eliminarlas manualmente con el botón 🗑."}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground text-center">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
            <MessageSquare className="w-8 h-8 opacity-40" />
            Sin conversaciones
          </div>
        ) : (
          filtered.map((c) => {
            const isSelected = c.id === selectedId;
            const slaOverdue = c.sla_due_at && new Date(c.sla_due_at) < new Date() && c.status !== "cerrado";
            const isClosed = c.status === "cerrado";
            return (
              <div
                key={c.id}
                className={cn(
                  "group relative border-b transition-colors hover:bg-muted/50",
                  isSelected && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <button
                  onClick={() => onSelect(c.id)}
                  className="w-full text-left px-3 py-2.5"
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", priorityDot[c.priority])} />
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">
                          {c.visitor_name ?? c.visitor_phone ?? c.visitor_email ?? "Visitante anónimo"}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(c.last_message_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0 h-4", statusClass[c.status])}>
                          {statusLabel[c.status]}
                        </Badge>
                        {c.unread_admin > 0 && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">{c.unread_admin}</Badge>
                        )}
                        {slaOverdue && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 animate-pulse">SLA</Badge>
                        )}
                        {(c.lead_id || c.service_case_id) && (
                          <span className="text-[9px] text-muted-foreground">
                            {c.service_case_id ? "🗂 caso" : "👤 lead"}
                          </span>
                        )}
                        {isClosed && c.closed_at && (
                          <span className="text-[9px] text-muted-foreground">
                            cerrada {new Date(c.closed_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                    title="Eliminar conversación"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar conversación"
        description={`Se eliminará permanentemente la conversación con ${deleteTarget?.visitor_name ?? deleteTarget?.visitor_phone ?? "este visitante"} y todos sus mensajes. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
      />
    </div>
  );
}
