import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandoffControls } from "./HandoffControls";
import { Mail, Phone, User as UserIcon, Briefcase, MessageSquare, ExternalLink, Plus } from "lucide-react";
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

  useEffect(() => {
    setName(convo.visitor_name ?? "");
    setPhone(convo.visitor_phone ?? "");
    setEmail(convo.visitor_email ?? "");
    setPriority(convo.priority);
  }, [convo.id, convo.visitor_name, convo.visitor_phone, convo.visitor_email, convo.priority]);

  async function saveDetails() {
    setBusy(true);
    const slaMinutes = SLA_MIN[priority] ?? 240;
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
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Datos actualizados" });
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
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="h-8 text-sm" />
        <div className="relative">
          <Phone className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="h-8 pl-7 text-sm" />
        </div>
        <div className="relative">
          <Mail className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-8 pl-7 text-sm" />
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
