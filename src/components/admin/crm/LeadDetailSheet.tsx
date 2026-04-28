import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Phone, Mail, MapPin, Calendar, MessageSquare, Clock, DollarSign, Sparkles, Send, ExternalLink, Repeat2, PhoneCall, CalendarPlus, ChevronDown, IdCard, History } from "lucide-react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import AIClassificationCard from "./AIClassificationCard";
import AIClassificationHistory from "./AIClassificationHistory";
import { AIActionTooltip } from "@/components/admin/AIActionTooltip";
import { validateClPhone, openWhatsAppChat, firstName, prettyClPhone } from "@/lib/whatsapp";
import { LinkedChatPanel } from "@/components/admin/chat/LinkedChatPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ServiceSelector from "@/components/admin/shared/ServiceSelector";
import type { ServiceTypeId } from "@/lib/service-catalog";

interface LeadDetailSheetProps {
  lead: any | null;
  onClose: () => void;
  onUpdate: () => void;
}

const PIPELINE_STAGES = [
  { id: "nuevo", label: "Nuevo" },
  { id: "contactado", label: "Contactado" },
  { id: "cotizado", label: "Cotizado" },
  { id: "contratado", label: "Contratado" },
  { id: "cerrado", label: "Cerrado" },
];

export default function LeadDetailSheet({ lead, onClose, onUpdate }: LeadDetailSheetProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("nota");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [serviceType, setServiceType] = useState<string>("");
  const [serviceOption, setServiceOption] = useState<string>("");
  const [classifying, setClassifying] = useState(false);
  const [localClassification, setLocalClassification] = useState<any>(null);
  const [localSummary, setLocalSummary] = useState<string | null>(null);
  const [classificationHistory, setClassificationHistory] = useState<any[]>([]);
  const [personInfo, setPersonInfo] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!lead) return;
    setEstimatedValue(lead.estimated_value?.toString() ?? "");
    setLocalClassification(lead.ai_classification && Object.keys(lead.ai_classification).length > 0 ? lead.ai_classification : null);
    setLocalSummary(lead.ai_summary ?? null);
    loadNotes();
    loadActivities();
    loadClassificationHistory();
    loadPersonInfo();
  }, [lead?.id]);

  const loadPersonInfo = async () => {
    if (!lead?.person_id) { setPersonInfo(null); return; }
    const { data, error } = await supabase.rpc("get_person_prefill", { _person_id: lead.person_id });
    if (!error && data && data.length) setPersonInfo(data[0]);
  };

  const loadNotes = async () => {
    if (!lead) return;
    const { data } = await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setNotes(data ?? []);
  };

  const loadClassificationHistory = async () => {
    if (!lead) return;
    const { data } = await supabase
      .from("lead_activities")
      .select("id, metadata, created_at")
      .eq("lead_id", lead.id)
      .eq("activity_type", "ai_classification")
      .order("created_at", { ascending: false })
      .limit(10);
    setClassificationHistory(data ?? []);
  };

  const loadActivities = async () => {
    if (!lead) return;
    const { data } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setActivities(data ?? []);
  };

  const addNote = async () => {
    if (!newNote.trim() || !lead || !user) return;
    const { error } = await supabase.from("lead_notes").insert({
      lead_id: lead.id,
      author_id: user.id,
      content: newNote.trim(),
      note_type: noteType,
    });
    if (error) {
      toast({ title: "Error", description: "No se pudo agregar la nota", variant: "destructive" });
      return;
    }
    // Log activity
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      activity_type: noteType,
      description: `Nota (${noteType}): ${newNote.trim().substring(0, 100)}`,
      performed_by: user.id,
    });
    setNewNote("");
    loadNotes();
    loadActivities();
    toast({ title: "Nota agregada" });
  };

  const updateField = async (field: "pipeline_stage" | "estimated_value" | "next_follow_up" | "status", value: string | number | null) => {
    if (!lead) return;
    const { error } = await supabase.from("contact_leads").update({ [field]: value } as any).eq("id", lead.id);
    if (!error) {
      onUpdate();
      toast({ title: "Actualizado" });
    }
  };

  const classifyWithAI = async () => {
    if (!lead) return;
    setClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-lead", { body: { leadId: lead.id } });
      if (error) throw error;
      // Show result instantly from the function response
      if (data?.classification) {
        const enriched = { ...data.classification, _source: data.source ?? data.classification._source ?? "ai" };
        setLocalClassification(enriched);
        setLocalSummary(data.classification.summary ?? null);
        // Update estimated value if returned (only if real)
        if (data.classification.estimated_value && data.classification.estimated_value > 0) {
          setEstimatedValue(data.classification.estimated_value.toString());
        }
      } else {
        // Fallback: re-fetch the lead from DB
        const { data: updated } = await supabase.from("contact_leads").select("ai_classification, ai_summary").eq("id", lead.id).single();
        if (updated) {
          setLocalClassification(updated.ai_classification && Object.keys(updated.ai_classification as any).length > 0 ? updated.ai_classification : null);
          setLocalSummary(updated.ai_summary ?? null);
        }
      }
      const isHeuristic = data?.source === "heuristic";
      toast({
        title: isHeuristic ? "🧠 Análisis heurístico completado" : "✅ Análisis IA completado",
        description: isHeuristic
          ? "IA no disponible — usamos clasificación inteligente basada en reglas y datos históricos."
          : undefined,
      });
      onUpdate();
      loadActivities();
      loadClassificationHistory();
    } catch {
      toast({ title: "Error", description: "No se pudo clasificar el lead", variant: "destructive" });
    }
    setClassifying(false);
  };

  const openWhatsApp = () => {
    const v = validateClPhone(lead?.phone);
    if (v.ok !== true) {
      toast({
        title: "No se puede abrir WhatsApp",
        description: v.reason,
        variant: "destructive",
      });
      return;
    }
    const nombre = firstName(lead?.name);
    const saludo = nombre ? `Hola ${nombre}` : "Hola, buenos días";

    let contexto = "";
    if (lead.selected_plan) {
      contexto = ` por su consulta sobre el ${lead.selected_plan}`;
    } else if (lead.intent === "servicio_funerario_urgente" || lead.urgency === "inmediata") {
      contexto = " por su solicitud de servicio funerario";
    } else if (lead.intent === "cremacion") {
      contexto = " por su consulta sobre cremación";
    } else if (lead.intent === "traslado") {
      contexto = " por su consulta sobre traslado";
    } else if (lead.intent === "cotizacion") {
      contexto = " por su solicitud de cotización";
    } else if (lead.intent === "prevision_funeraria") {
      contexto = " por su consulta sobre previsión funeraria";
    } else if (lead.intent === "memorial_legado") {
      contexto = " por su consulta sobre memoriales";
    } else if (lead.message) {
      contexto = " por su mensaje reciente";
    }

    const mensaje = `${saludo}, le saluda Funeraria Santa Margarita 🙏.\n\nLe escribimos${contexto}. Estamos a su disposición para acompañarle con respeto y cariño en este momento.\n\n¿En qué podemos ayudarle?`;

    const ok = openWhatsAppChat(v.number, mensaje);
    if (!ok) {
      navigator.clipboard.writeText(mensaje).catch(() => {});
      toast({
        title: "📋 Mensaje copiado",
        description: `Tu navegador bloqueó la apertura. Pega el mensaje en WhatsApp para ${v.pretty}.`,
      });
    }
  };

  const callLead = async () => {
    const v = validateClPhone(lead?.phone);
    if (v.ok !== true) {
      toast({ title: "Teléfono inválido", description: v.reason, variant: "destructive" });
      return;
    }
    window.location.href = `tel:${v.number}`;
    // Log activity
    if (user) {
      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        activity_type: "llamada",
        description: `Llamada iniciada desde CRM a ${v.pretty}`,
        performed_by: user.id,
      });
      loadActivities();
    }
  };

  const scheduleMeeting = async () => {
    if (!lead || !user) return;
    // Avanza el pipeline a "contactado" si está en "nuevo" y registra nota
    const updates: Record<string, any> = { last_contacted_at: new Date().toISOString() };
    if (!lead.pipeline_stage || lead.pipeline_stage === "nuevo") {
      updates.pipeline_stage = "contactado";
    }
    await supabase.from("contact_leads").update(updates as any).eq("id", lead.id);
    await supabase.from("lead_notes").insert({
      lead_id: lead.id,
      author_id: user.id,
      content: `Reunión a programar con ${lead.name ?? "el lead"}. Coordinar fecha y enviar confirmación.`,
      note_type: "nota",
    });
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      activity_type: "schedule_meeting",
      description: "Solicitud de programación de reunión generada desde resumen de re-contactos",
      performed_by: user.id,
    });
    toast({ title: "📅 Reunión marcada para programar", description: "Lead movido a 'Contactado' y nota creada." });
    onUpdate();
    loadNotes();
    loadActivities();
  };

  const urgencyLabels: Record<string, string> = {
    immediate: "Inmediato",
    inmediata: "Inmediato",
    normal: "Normal",
    alta: "Alta",
    high: "Alta",
    baja: "Baja",
    low: "Baja",
    "previsión": "Previsión",
    prevision: "Previsión",
  };

  if (!lead) return null;

  const noteTypeIcons: Record<string, string> = {
    nota: "📝",
    llamada: "📞",
    email: "📧",
    whatsapp: "💬",
  };

  return (
    <Sheet open={!!lead} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:w-[480px] sm:max-w-[480px] overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {lead.name ?? "Sin nombre"}
            {lead.urgency && (
              <Badge variant="outline" className={cn("text-[10px]", lead.urgency === "inmediata" || lead.urgency === "immediate" ? "border-red-300 text-red-700" : "")}>
                {urgencyLabels[lead.urgency] ?? lead.urgency}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Contact Info */}
          <div className="space-y-2">
            {lead.phone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{lead.phone}</div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openWhatsApp}>
                  <ExternalLink className="w-3 h-3 mr-1" />WhatsApp
                </Button>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{lead.email}</div>
            )}
            {lead.comuna && (
              <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" />{lead.comuna}</div>
            )}
            <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" />{format(new Date(lead.created_at), "dd MMM yyyy HH:mm", { locale: es })}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: es })}
            </div>
            {(() => {
              const attr = (lead.metadata as any)?.comuna_attribution;
              if (!attr) return null;
              return (
                <div className="rounded-md border border-gold/40 bg-gold/5 p-2.5 mt-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gold font-semibold">
                    <MapPin className="w-3 h-3" /> Atribución de origen
                  </div>
                  <div className="text-xs text-foreground">
                    Llegó desde landing{" "}
                    <a
                      href={`/funeraria/${attr.comuna_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline hover:text-gold"
                    >
                      {attr.comuna_nombre}
                    </a>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {attr.visit_count} visita{attr.visit_count !== 1 ? "s" : ""} en sesión
                    {attr.referrer ? ` · ref: ${new URL(attr.referrer).hostname}` : ""}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Expediente unificado (Cliente 360) */}
          {lead.person_id && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-primary font-semibold">
                  <IdCard className="w-3.5 h-3.5" /> Expediente unificado
                </div>
                <Link
                  to={`/admin/clientes-360?person=${lead.person_id}`}
                  className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  Ver Cliente 360 <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              {personInfo ? (
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-foreground">{personInfo.full_name}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                    {personInfo.rut && <span>RUT: {personInfo.rut}</span>}
                    {personInfo.total_cases > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <History className="w-3 h-3" />
                        {personInfo.total_cases} caso{personInfo.total_cases !== 1 ? "s" : ""} previo{personInfo.total_cases !== 1 ? "s" : ""}
                      </span>
                    )}
                    {personInfo.last_case_at && (
                      <span>Último: {format(new Date(personInfo.last_case_at), "dd MMM yyyy", { locale: es })}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground italic">
                    Datos heredados automáticamente al convertir este lead en caso.
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">Cargando expediente…</div>
              )}
            </div>
          )}

          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Etapa</label>
              <Select value={lead.pipeline_stage || "nuevo"} onValueChange={(v) => updateField("pipeline_stage", v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor Estimado</label>
              <div className="flex gap-1 mt-1">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={estimatedValue}
                  onChange={e => setEstimatedValue(e.target.value)}
                  placeholder="$0"
                />
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => updateField("estimated_value", parseInt(estimatedValue) || 0)}>
                  <DollarSign className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Message */}
          {lead.message && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mensaje original</label>
              <div className="mt-1 p-3 rounded-md bg-muted/50 text-sm">{lead.message}</div>
            </div>
          )}

          {/* AI Classification */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Análisis IA</label>
              <AIActionTooltip
                actionKey="crm.classify_lead"
                description="Analiza este lead con IA: clasifica intención (compra, consulta, urgencia), detecta plan probable, valor estimado, prioridad y sugiere la próxima acción comercial."
                side="left"
              >
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={classifyWithAI} disabled={classifying}>
                  <Sparkles className="w-3 h-3 mr-1" />{classifying ? "Analizando..." : localClassification ? "Re-analizar" : "Analizar"}
                </Button>
              </AIActionTooltip>
            </div>
            {localClassification ? (
              <AIClassificationCard classification={localClassification} planName={lead.selected_plan} />
            ) : (
              <p className="text-xs text-muted-foreground">Sin análisis aún. Haz clic en "Analizar" para clasificar con IA.</p>
            )}
          </div>

          {/* AI Classification History */}
          <AIClassificationHistory entries={classificationHistory} planName={lead.selected_plan} />

          {lead.selected_plan && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Plan seleccionado</label>
              <Badge variant="secondary" className="mt-1">{lead.selected_plan}</Badge>
            </div>
          )}

          <Separator />

          {/* Add Note */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Agregar nota</label>
            <div className="flex gap-2">
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota">📝 Nota</SelectItem>
                  <SelectItem value="llamada">📞 Llamada</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              className="text-sm min-h-[60px]"
              placeholder="Escribe una nota..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <Button size="sm" className="w-full h-8" onClick={addNote} disabled={!newNote.trim()}>
              <Send className="w-3 h-3 mr-1" />Agregar
            </Button>
          </div>

          {/* Notes List */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Notas ({notes.length})</label>
              {notes.map(note => (
                <div key={note.id} className="p-2 rounded-md border bg-muted/30 text-sm">
                  <div className="flex items-center gap-1 mb-1">
                    <span>{noteTypeIcons[note.note_type] || "📝"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(note.created_at), "dd/MM HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs">{note.content}</p>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Re-contact indicator (last 24h) */}
          {(() => {
            const since24 = Date.now() - 24 * 60 * 60 * 1000;
            const allRecontacts = activities.filter((a) => a.activity_type === "duplicate_contact");
            const recontacts = allRecontacts.filter((a) => new Date(a.created_at).getTime() >= since24);
            if (recontacts.length === 0) return null;
            const last = recontacts[0];
            const first = recontacts[recontacts.length - 1];
            const spanMin = Math.max(1, Math.round((new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) / 60000));
            const channels = Array.from(new Set(recontacts.map((r) => (r.metadata as any)?.contact_type).filter(Boolean)));
            const stage = lead.pipeline_stage || "nuevo";

            // Recomendación dinámica según volumen + etapa → define acción primaria
            type Action = "whatsapp" | "call" | "schedule" | "follow";
            let recommendation = "";
            let primaryAction: Action = "follow";
            if (recontacts.length >= 3 && stage === "nuevo") {
              recommendation = "🔥 Alta intención: el lead insiste. Llama AHORA por WhatsApp antes de que contacte a la competencia.";
              primaryAction = "whatsapp";
            } else if (recontacts.length >= 2 && (stage === "contactado" || stage === "cotizado")) {
              recommendation = "⚠️ Está esperando respuesta. Responde con cotización o agenda visita en menos de 1 hora.";
              primaryAction = "schedule";
            } else if (recontacts.length >= 1 && stage === "nuevo") {
              recommendation = "📞 Lead repite contacto. Prioriza llamada en próximos 30 min.";
              primaryAction = "call";
            } else {
              recommendation = "👀 Mantén seguimiento activo. Confirma si necesita más información.";
              primaryAction = "whatsapp";
            }

            const isPrimary = (a: Action) => a === primaryAction;

            return (
              <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Repeat2 className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    {recontacts.length} re-contacto{recontacts.length !== 1 ? "s" : ""} en últimas 24h
                  </span>
                  <Badge variant="outline" className="ml-auto text-[10px] border-amber-400 text-amber-700">
                    Último {formatDistanceToNow(new Date(last.created_at), { addSuffix: true, locale: es })}
                  </Badge>
                </div>

                {/* Resumen narrativo */}
                <div className="rounded bg-white/60 dark:bg-amber-950/30 border border-amber-200/60 p-2 text-[11px] text-amber-900 dark:text-amber-100 leading-relaxed">
                  <p>
                    <span className="font-semibold">Historia:</span> el contacto se repitió{" "}
                    <span className="font-semibold">{recontacts.length} {recontacts.length === 1 ? "vez" : "veces"}</span>
                    {recontacts.length > 1 ? ` en un lapso de ${spanMin < 60 ? `${spanMin} min` : `${Math.round(spanMin / 60)} h`}` : ""}
                    {channels.length > 0 ? ` vía ${channels.join(", ")}` : ""}.
                    {allRecontacts.length > recontacts.length && (
                      <> Total histórico: <span className="font-semibold">{allRecontacts.length}</span>.</>
                    )}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Último mensaje:</span> "{(last.description || "").replace(/^Re-contacto detectado \([^)]+\)\.\s*Mensaje:\s*/i, "").slice(0, 120) || "sin texto"}"
                  </p>
                  <p className="mt-1.5 pt-1.5 border-t border-amber-200/60">
                    <span className="font-semibold">Próximo paso:</span> {recommendation}
                  </p>
                </div>

                {/* Acciones rápidas — la recomendada queda destacada */}
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    size="sm"
                    variant={isPrimary("call") ? "default" : "outline"}
                    className={cn("h-8 text-[11px] px-2", isPrimary("call") && "bg-amber-600 hover:bg-amber-700 text-white border-amber-600")}
                    onClick={callLead}
                    disabled={!lead.phone}
                  >
                    <PhoneCall className="w-3 h-3 mr-1" />Llamar
                  </Button>
                  <Button
                    size="sm"
                    variant={isPrimary("whatsapp") ? "default" : "outline"}
                    className={cn("h-8 text-[11px] px-2", isPrimary("whatsapp") && "bg-amber-600 hover:bg-amber-700 text-white border-amber-600")}
                    onClick={openWhatsApp}
                    disabled={!lead.phone}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant={isPrimary("schedule") ? "default" : "outline"}
                    className={cn("h-8 text-[11px] px-2", isPrimary("schedule") && "bg-amber-600 hover:bg-amber-700 text-white border-amber-600")}
                    onClick={scheduleMeeting}
                  >
                    <CalendarPlus className="w-3 h-3 mr-1" />Reunión
                  </Button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recontacts.map((rc) => (
                    <div key={rc.id} className="flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
                      <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="line-clamp-2">{rc.description}</p>
                        <p className="text-[10px] opacity-70">
                          {format(new Date(rc.created_at), "dd/MM HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Linked Chat Conversations */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Conversaciones de chat vinculadas
              </span>
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <LinkedChatPanel leadId={lead.id} compact />
            </CollapsibleContent>
          </Collapsible>

          {/* Activity Timeline */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Timeline de Actividad</label>
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin actividad registrada</p>
            ) : (
              <div className="space-y-1">
                {activities.map(act => (
                  <div key={act.id} className="flex items-start gap-2 text-xs">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", act.activity_type === "duplicate_contact" ? "bg-amber-500" : "bg-primary")} />
                    <div>
                      <p>{act.description}</p>
                      <p className="text-muted-foreground">{formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: es })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
