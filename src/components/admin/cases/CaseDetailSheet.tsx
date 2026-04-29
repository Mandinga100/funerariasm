import { useState, useEffect, useRef, useCallback } from "react";
import { useLiveRecord } from "@/hooks/use-live-record";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Calendar, Save, ExternalLink, User, FileText, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { validateClPhone, openWhatsAppChat, firstName } from "@/lib/whatsapp";
import CaseDeceasedTab from "./CaseDeceasedTab";
import CaseStatusTab from "./CaseStatusTab";
import CaseChecklistTab from "./CaseChecklistTab";
import CaseDocumentsTab from "./CaseDocumentsTab";
import CaseHistoryTab from "./CaseHistoryTab";
import CaseTrackingWidget from "./CaseTrackingWidget";
import CaseQuoteTab from "./CaseQuoteTab";
import CasePaymentsTab from "./CasePaymentsTab";
import ServiceSelector from "@/components/admin/shared/ServiceSelector";
import type { ServiceTypeId } from "@/lib/service-catalog";
import AgendaEventModal, { type AgendaPrefill } from "@/components/admin/agenda/AgendaEventModal";
import { LinkedChatPanel } from "@/components/admin/chat/LinkedChatPanel";
import { useNavigate } from "react-router-dom";

interface CaseDetailSheetProps {
  serviceCase: any | null;
  onClose: () => void;
  onUpdate: () => void;
}

const PIPELINE_STAGES = [
  { id: "contactado", label: "Contactado" },
  { id: "cotizado", label: "Cotizado" },
  { id: "contratado", label: "Contratado" },
  { id: "cerrado", label: "Cerrado" },
];

const PAYMENT_STATUSES = [
  { id: "pendiente", label: "Pendiente" },
  { id: "cotizado", label: "Cotizado" },
  { id: "aprobado", label: "Aprobado" },
  { id: "pagado", label: "Pagado" },
  { id: "cancelado", label: "Cancelado" },
];

// Catálogo unificado en src/lib/service-catalog.ts

const fmt = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export default function CaseDetailSheet({ serviceCase, onClose, onUpdate }: CaseDetailSheetProps) {
  // Caso "vivo": se refresca tras cualquier guardado y vía Realtime entre operadores.
  const { record: liveCase, refresh } = useLiveRecord<any>("service_cases", serviceCase);
  const current = liveCase ?? serviceCase;

  const [pipelineStage, setPipelineStage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [serviceType, setServiceType] = useState<string>("");
  const [serviceOption, setServiceOption] = useState<string>("");
  const [ceremonyLocation, setCeremonyLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("resumen");
  const [agendaOpen, setAgendaOpen] = useState(false);
  const dirtyRef = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Hidratar inputs cuando cambia el caso o llegan datos frescos (Realtime / refresh).
  // Solo sobrescribe el form local si el usuario NO tiene cambios sin guardar (dirtyRef = false).
  useEffect(() => {
    if (!current) return;
    if (dirtyRef.current) return;
    setPipelineStage(current.pipeline_stage ?? "");
    setPaymentStatus(current.payment_status ?? "");
    setTotalAmount(current.total_amount?.toString() ?? "0");
    setServiceType(current.service_type ?? "servicio_funerario");
    setServiceOption(current.selected_plan ?? "");
    setCeremonyLocation(current.ceremony_location ?? "");
    setNotes(current.notes ?? "");
    setInternalNotes(current.internal_notes ?? "");
  }, [current?.id, current?.updated_at]);

  // Reset al cambiar de caso
  useEffect(() => {
    dirtyRef.current = false;
    setTab("resumen");
  }, [serviceCase?.id]);

  const markDirty = () => { dirtyRef.current = true; };

  // Refresh + propagar al padre (lista) tras cualquier save de cualquier pestaña
  const onTabSaved = useCallback(async () => {
    await refresh();
    onUpdate();
  }, [refresh, onUpdate]);

  const save = useCallback(async (silent = false) => {
    if (!current) return;
    setSaving(true);
    const updates: any = {
      pipeline_stage: pipelineStage,
      payment_status: paymentStatus,
      total_amount: parseInt(totalAmount) || 0,
      service_type: serviceType,
      selected_plan: serviceOption || null,
      ceremony_location: ceremonyLocation || null,
      notes: notes || null,
      internal_notes: internalNotes || null,
    };
    if (pipelineStage === "cerrado" && !current.closed_at) {
      updates.closed_at = new Date().toISOString();
    }
    const { error } = await supabase.from("service_cases").update(updates).eq("id", current.id);
    if (error) {
      if (!silent) toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    } else {
      if (current.lead_id && pipelineStage !== current.pipeline_stage) {
        await supabase.from("contact_leads").update({ pipeline_stage: pipelineStage } as any).eq("id", current.lead_id);
      }
      dirtyRef.current = false;
      if (!silent) toast({ title: "✅ Caso actualizado" });
      await refresh();
      onUpdate();
    }
    setSaving(false);
  }, [current, pipelineStage, paymentStatus, totalAmount, serviceType, serviceOption, ceremonyLocation, notes, internalNotes, refresh, onUpdate, toast]);

  // Auto-save al cambiar de pestaña si hay cambios pendientes en Resumen
  const handleTabChange = useCallback(async (next: string) => {
    if (tab === "resumen" && dirtyRef.current && next !== "resumen") {
      await save(true);
      toast({ title: "💾 Cambios guardados", description: "Resumen sincronizado antes de cambiar de pestaña.", duration: 2000 });
    }
    setTab(next);
  }, [tab, save, toast]);

  const openWhatsApp = () => {
    const v = validateClPhone(current?.client_phone);
    if (v.ok !== true) {
      toast({
        title: "No se puede abrir WhatsApp",
        description: v.reason,
        variant: "destructive",
      });
      return;
    }
    const nombre = firstName(current?.client_name);
    const saludo = nombre ? `Hola ${nombre}` : "Hola, buenos días";
    const mensaje = `${saludo}, le saluda Funeraria Santa Margarita 🙏.\n\nNos comunicamos en relación a su caso ${current.case_number}. Estamos a su disposición para acompañarle con respeto en este momento.\n\n¿En qué podemos ayudarle?`;
    const ok = openWhatsAppChat(v.number, mensaje);
    if (!ok) {
      navigator.clipboard.writeText(mensaje).catch(() => {});
      toast({
        title: "📋 Mensaje copiado",
        description: `Tu navegador bloqueó la apertura. Pega el mensaje en WhatsApp para ${v.pretty}.`,
      });
    }
  };

  if (!serviceCase) return null;

  return (
    <Sheet open={!!serviceCase} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:w-[640px] sm:max-w-[640px] overflow-y-auto p-4 sm:p-6">
        <SheetHeader className="pr-10">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{current.case_number}</span>
              </SheetTitle>
              <p className="text-lg font-semibold truncate">{current.client_name ?? "Sin nombre"}</p>
              {current.deceased_name && (
                <p className="text-xs text-muted-foreground">Fallecido/a: <span className="font-medium text-foreground">{current.deceased_name}</span></p>
              )}
            </div>
            <Button
              size="sm"
              variant="default"
              className="h-8 shrink-0 gap-1.5"
              onClick={() => setAgendaOpen(true)}
              title="Agendar evento vinculado a este caso"
            >
              <CalendarPlus className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Agendar</span>
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={handleTabChange} className="mt-4">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-9 h-auto gap-0.5">
            <TabsTrigger value="resumen" className="text-[11px] sm:text-xs px-1.5 py-1.5">Resumen</TabsTrigger>
            <TabsTrigger value="fallecido" className="text-[11px] sm:text-xs px-1.5 py-1.5">Fallecido</TabsTrigger>
            <TabsTrigger value="cotizacion" className="text-[11px] sm:text-xs px-1.5 py-1.5">Cotización</TabsTrigger>
            <TabsTrigger value="pagos" className="text-[11px] sm:text-xs px-1.5 py-1.5">Pagos</TabsTrigger>
            <TabsTrigger value="estados" className="text-[11px] sm:text-xs px-1.5 py-1.5">Estados</TabsTrigger>
            <TabsTrigger value="checklist" className="text-[11px] sm:text-xs px-1.5 py-1.5">Hitos</TabsTrigger>
            <TabsTrigger value="docs" className="text-[11px] sm:text-xs px-1.5 py-1.5">Docs</TabsTrigger>
            <TabsTrigger value="chat" className="text-[11px] sm:text-xs px-1.5 py-1.5">Chat</TabsTrigger>
            <TabsTrigger value="historial" className="text-[11px] sm:text-xs px-1.5 py-1.5">Historial</TabsTrigger>
          </TabsList>

          {/* ----- RESUMEN ----- */}
          <TabsContent value="resumen" className="space-y-5 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Información del Cliente</label>
              {current.client_phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{current.client_phone}</div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openWhatsApp}>
                    <ExternalLink className="w-3 h-3 mr-1" />WhatsApp
                  </Button>
                </div>
              )}
              {current.client_email && (
                <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{current.client_email}</div>
              )}
              {current.comuna && (
                <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" />{current.comuna}</div>
              )}
              <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" />{format(new Date(current.created_at), "dd MMM yyyy HH:mm", { locale: es })}</div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Etapa del Caso</label>
                <Select value={pipelineStage} onValueChange={(v) => { markDirty(); setPipelineStage(v); }}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Estado de Pago</label>
                <Select value={paymentStatus} onValueChange={(v) => { markDirty(); setPaymentStatus(v); }}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ServiceSelector
              serviceType={serviceType}
              serviceOption={serviceOption}
              amount={totalAmount}
              onServiceTypeChange={(v) => { markDirty(); setServiceType(v); }}
              onServiceOptionChange={(v) => { markDirty(); setServiceOption(v); }}
              onAmountChange={(v) => { markDirty(); setTotalAmount(v); }}
            />

            <Separator />

            <CaseTrackingWidget caseId={current.id} />

            <Separator />

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />Lugar de ceremonia</label>
              <Input className="h-8 text-sm" placeholder="Lugar de ceremonia" value={ceremonyLocation} onChange={e => { markDirty(); setCeremonyLocation(e.target.value); }} />
            </div>

            {current.original_message && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Mensaje original del Lead</label>
                <div className="mt-1 p-3 rounded-md bg-muted/50 text-sm">{current.original_message}</div>
              </div>
            )}

            {current.ai_summary && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Resumen IA</label>
                <div className="mt-1 p-3 rounded-md bg-primary/5 text-sm">{current.ai_summary}</div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />Notas del Caso</label>
              <Textarea className="text-sm min-h-[60px]" placeholder="Notas visibles..." value={notes} onChange={e => { markDirty(); setNotes(e.target.value); }} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Notas Internas (privadas)</label>
              <Textarea className="text-sm min-h-[60px]" placeholder="Notas internas del equipo..." value={internalNotes} onChange={e => { markDirty(); setInternalNotes(e.target.value); }} />
            </div>

            <Button className="w-full" onClick={() => save(false)} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />{saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </TabsContent>

          {/* ----- FALLECIDO ----- */}
          <TabsContent value="fallecido" className="mt-4">
            <CaseDeceasedTab caseId={current.id} initial={current} onSaved={onTabSaved} />
          </TabsContent>

          {/* ----- COTIZACIÓN ----- */}
          <TabsContent value="cotizacion" className="mt-4">
            <CaseQuoteTab caseId={current.id} onSaved={onTabSaved} />
          </TabsContent>

          {/* ----- PAGOS ----- */}
          <TabsContent value="pagos" className="mt-4">
            <CasePaymentsTab
              caseId={current.id}
              caseNumber={current.case_number}
              totalAmount={current.total_amount ?? 0}
              onSaved={onTabSaved}
            />
          </TabsContent>

          {/* ----- ESTADOS MÚLTIPLES ----- */}
          <TabsContent value="estados" className="mt-4">
            <CaseStatusTab caseId={current.id} initial={current} onSaved={onTabSaved} />
          </TabsContent>

          {/* ----- CHECKLIST OPERATIVO ----- */}
          <TabsContent value="checklist" className="mt-4">
            <CaseChecklistTab caseId={current.id} onChanged={onTabSaved} />
          </TabsContent>

          {/* ----- EXPEDIENTE DOCUMENTAL ----- */}
          <TabsContent value="docs" className="mt-4">
            <CaseDocumentsTab caseId={current.id} />
          </TabsContent>

          {/* ----- CHAT VINCULADO ----- */}
          <TabsContent value="chat" className="mt-4">
            <LinkedChatPanel serviceCaseId={current.id} compact />
          </TabsContent>

          {/* ----- BITÁCORA ----- */}
          <TabsContent value="historial" className="mt-4">
            <CaseHistoryTab caseId={current.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>

      <AgendaEventModal
        open={agendaOpen}
        onOpenChange={setAgendaOpen}
        event={null}
        prefill={{
          title: `Caso ${current.case_number}${current.deceased_name ? ` — ${current.deceased_name}` : ""}`,
          description: current.service_description ?? current.notes ?? undefined,
          eventType: "reunion",
          priority: current.urgency === "inmediata" || current.urgency === "urgente" ? "alta" : "normal",
          serviceCaseId: current.id,
          leadId: current.lead_id ?? undefined,
          contactName: current.client_name ?? undefined,
          contactPhone: current.client_phone ?? undefined,
          contactEmail: current.client_email ?? undefined,
          comuna: current.comuna ?? undefined,
        } satisfies AgendaPrefill}
        onSaved={(createdEventId) => {
          setAgendaOpen(false);
          toast({
            title: "📅 Evento agendado",
            description: "El evento quedó vinculado a este caso.",
          });
          onTabSaved();
          if (createdEventId) {
            navigate(`/admin/agenda?event=${createdEventId}`);
          }
        }}
      />
    </Sheet>
  );
}
}
