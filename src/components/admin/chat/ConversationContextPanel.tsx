import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandoffControls } from "./HandoffControls";
import { Mail, Phone, User as UserIcon, Briefcase, MessageSquare, ExternalLink, Plus, RefreshCw, History, ChevronDown, ChevronUp, Wifi, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ConversationRow } from "./ConversationList";

interface Props {
  convo: ConversationRow;
}

const SLA_MIN: Record<string, number> = { urgente: 15, alta: 60, normal: 240, baja: 1440 };

export function ConversationContextPanel({ convo }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState(convo.visitor_name ?? "");
  const [phone, setPhone] = useState(convo.visitor_phone ?? "");
  const [email, setEmail] = useState(convo.visitor_email ?? "");
  const [priority, setPriority] = useState(convo.priority);
  const [busy, setBusy] = useState(false);

  // Estado de foco controlado por handlers onFocus/onBlur en cada input.
  // Evita depender de `document.activeElement` (que no existe en SSR y puede
  // dar lecturas inconsistentes durante re-renders o transiciones de foco).
  const [focusedField, setFocusedField] = useState<"name" | "phone" | "email" | null>(null);

  // Indicador visual: hay datos nuevos del visitante que aún no se aplicaron
  // localmente porque el admin está editando. Permite refrescar manualmente.
  const [pendingSync, setPendingSync] = useState<null | {
    visitor_name: string | null;
    visitor_phone: string | null;
    visitor_email: string | null;
  }>(null);

  // Log interno de cambios de campo: distingue origen del cambio
  // ("executive" = guardado manual del ejecutivo / "realtime" = sync automático
  // desde la DB porque el visitante o un colega lo modificó).
  type ChangeOrigin = "executive" | "realtime";
  type ChangeEntry = {
    id: string;
    at: number;
    field: "visitor_name" | "visitor_phone" | "visitor_email" | "priority";
    from: string;
    to: string;
    origin: ChangeOrigin;
  };
  const [changeLog, setChangeLog] = useState<ChangeEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);

  function pushChange(entry: Omit<ChangeEntry, "id" | "at">) {
    if ((entry.from ?? "") === (entry.to ?? "")) return;
    setChangeLog((prev) => [
      { ...entry, id: crypto.randomUUID(), at: Date.now() },
      ...prev,
    ].slice(0, 30));
  }

  // Reset del log al cambiar de conversación seleccionada.
  useEffect(() => {
    setChangeLog([]);
    setLogOpen(false);
  }, [convo.id]);

  useEffect(() => {
    const incoming = {
      visitor_name: convo.visitor_name ?? "",
      visitor_phone: convo.visitor_phone ?? "",
      visitor_email: convo.visitor_email ?? "",
    };

    // Aplicar sólo a los campos que NO están enfocados, para no romper edición en curso.
    let deferred = false;

    if (focusedField !== "name") {
      if (incoming.visitor_name !== name) {
        pushChange({ field: "visitor_name", from: name, to: incoming.visitor_name, origin: "realtime" });
      }
      setName(incoming.visitor_name);
    } else if (incoming.visitor_name !== name) deferred = true;

    if (focusedField !== "phone") {
      if (incoming.visitor_phone !== phone) {
        pushChange({ field: "visitor_phone", from: phone, to: incoming.visitor_phone, origin: "realtime" });
      }
      setPhone(incoming.visitor_phone);
    } else if (incoming.visitor_phone !== phone) deferred = true;

    if (focusedField !== "email") {
      if (incoming.visitor_email !== email) {
        pushChange({ field: "visitor_email", from: email, to: incoming.visitor_email, origin: "realtime" });
      }
      setEmail(incoming.visitor_email);
    } else if (incoming.visitor_email !== email) deferred = true;

    if (convo.priority !== priority) {
      pushChange({ field: "priority", from: priority, to: convo.priority, origin: "realtime" });
    }
    setPriority(convo.priority);

    setPendingSync(deferred ? {
      visitor_name: incoming.visitor_name,
      visitor_phone: incoming.visitor_phone,
      visitor_email: incoming.visitor_email,
    } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convo.id, convo.visitor_name, convo.visitor_phone, convo.visitor_email, convo.priority]);

  function applyPendingSync() {
    if (!pendingSync) return;
    setName(pendingSync.visitor_name ?? "");
    setPhone(pendingSync.visitor_phone ?? "");
    setEmail(pendingSync.visitor_email ?? "");
    setPendingSync(null);
  }

  async function saveDetails() {
    setBusy(true);
    const slaMinutes = SLA_MIN[priority] ?? 240;
    // Snapshot previo para diff con origen "executive".
    const prev = {
      visitor_name: convo.visitor_name ?? "",
      visitor_phone: convo.visitor_phone ?? "",
      visitor_email: convo.visitor_email ?? "",
      priority: convo.priority,
    };
    const { error } = await supabase
      .from("chat_conversations")
      .update({
        visitor_name: name || null,
        visitor_phone: phone || null,
        visitor_email: email || null,
        priority,
        sla_due_at: convo.status === "cerrado" ? convo.sla_due_at : new Date(Date.now() + slaMinutes * 60_000).toISOString(),
      })
      .eq("id", convo.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      pushChange({ field: "visitor_name", from: prev.visitor_name, to: name, origin: "executive" });
      pushChange({ field: "visitor_phone", from: prev.visitor_phone, to: phone, origin: "executive" });
      pushChange({ field: "visitor_email", from: prev.visitor_email, to: email, origin: "executive" });
      pushChange({ field: "priority", from: prev.priority, to: priority, origin: "executive" });
      toast({ title: "Datos actualizados" });
    }
    setBusy(false);
  }

  async function createLead() {
    if (!name && !phone && !email) {
      toast({ title: "Faltan datos", description: "Necesitas al menos nombre, teléfono o email.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data: lead, error } = await supabase
      .from("contact_leads")
      .insert({
        name: name || null,
        phone: phone || null,
        email: email || null,
        message: "Lead creado desde chat",
        contact_type: "chat",
        source: "chat_handoff",
        urgency: priority === "urgente" ? "inmediata" : priority === "alta" ? "alta" : "normal",
      })
      .select("id")
      .single();
    if (error || !lead) {
      toast({ title: "Error al crear lead", description: error?.message, variant: "destructive" });
    } else {
      await supabase.from("chat_conversations").update({ lead_id: lead.id }).eq("id", convo.id);
      toast({ title: "Lead creado y vinculado" });
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold mb-2">Acciones</h3>
        <HandoffControls convo={convo} />
      </div>

      <div className="p-3 border-b space-y-2.5">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <UserIcon className="w-3.5 h-3.5" /> Datos del visitante
        </h3>
        {pendingSync && (
          <button
            type="button"
            onClick={applyPendingSync}
            className="w-full flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-md border border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10 transition-colors"
            title="El visitante actualizó sus datos mientras editabas. Click para aplicar."
          >
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-primary" />
              Datos nuevos del visitante
            </span>
            <span className="text-primary font-medium">Aplicar</span>
          </button>
        )}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setFocusedField("name")}
          onBlur={() => setFocusedField((f) => (f === "name" ? null : f))}
          placeholder="Nombre"
          className="h-8 text-sm"
        />
        <div className="relative">
          <Phone className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onFocus={() => setFocusedField("phone")}
            onBlur={() => setFocusedField((f) => (f === "phone" ? null : f))}
            placeholder="Teléfono"
            className="h-8 pl-7 text-sm"
          />
        </div>
        <div className="relative">
          <Mail className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField((f) => (f === "email" ? null : f))}
            placeholder="Email"
            className="h-8 pl-7 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Prioridad</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as ConversationRow["priority"])}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baja">Baja</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={saveDetails} disabled={busy} className="w-full">Guardar cambios</Button>
      </div>

      <div className="p-3 border-b space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" /> Vinculación CRM
        </h3>
        {convo.lead_id ? (
          <div className="flex items-center justify-between gap-2 bg-muted/50 px-2.5 py-2 rounded-md text-xs">
            <span className="flex items-center gap-1.5"><UserIcon className="w-3 h-3" /> Lead vinculado</span>
            <Button asChild size="sm" variant="ghost" className="h-6 px-2 gap-1">
              <a href={`/admin/leads?lead=${convo.lead_id}`}><ExternalLink className="w-3 h-3" />Abrir</a>
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={createLead} disabled={busy} className="w-full gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Crear lead desde chat
          </Button>
        )}
        {convo.service_case_id && (
          <div className="flex items-center justify-between gap-2 bg-muted/50 px-2.5 py-2 rounded-md text-xs">
            <span className="flex items-center gap-1.5"><Briefcase className="w-3 h-3" /> Caso vinculado</span>
            <Button asChild size="sm" variant="ghost" className="h-6 px-2 gap-1">
              <a href={`/admin/casos?case=${convo.service_case_id}`}><ExternalLink className="w-3 h-3" />Abrir</a>
            </Button>
          </div>
        )}
      </div>

      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
          <MessageSquare className="w-3.5 h-3.5" /> SLA
        </h3>
        {convo.sla_due_at ? (
          <div className="text-xs space-y-1">
            <div className="text-muted-foreground">Vence:</div>
            <Badge variant={new Date(convo.sla_due_at) < new Date() ? "destructive" : "secondary"}>
              {new Date(convo.sla_due_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
            </Badge>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin SLA</span>
        )}
      </div>
    </div>
  );
}
