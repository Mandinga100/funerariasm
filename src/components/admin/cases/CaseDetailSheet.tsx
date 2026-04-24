import { useState, useEffect } from "react";
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
import AgendaEventModal, { type AgendaPrefill } from "@/components/admin/agenda/AgendaEventModal";
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

const SERVICE_TYPES = [
  { id: "servicio_funerario", label: "Servicio Funerario" },
  { id: "cremacion", label: "Cremación" },
  { id: "traslado", label: "Traslado" },
  { id: "prevision", label: "Previsión Funeraria" },
  { id: "memorial", label: "Memorial / Legado" },
];

const fmt = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export default function CaseDetailSheet({ serviceCase, onClose, onUpdate }: CaseDetailSheetProps) {
  const [pipelineStage, setPipelineStage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [ceremonyLocation, setCeremonyLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("resumen");
  const { toast } = useToast();

  useEffect(() => {
    if (!serviceCase) return;
    setPipelineStage(serviceCase.pipeline_stage);
    setPaymentStatus(serviceCase.payment_status);
    setTotalAmount(serviceCase.total_amount?.toString() ?? "0");
    setServiceType(serviceCase.service_type ?? "servicio_funerario");
    setCeremonyLocation(serviceCase.ceremony_location ?? "");
    setNotes(serviceCase.notes ?? "");
    setInternalNotes(serviceCase.internal_notes ?? "");
    setTab("resumen");
  }, [serviceCase?.id]);

  const save = async () => {
    if (!serviceCase) return;
    setSaving(true);
    const updates: any = {
      pipeline_stage: pipelineStage,
      payment_status: paymentStatus,
      total_amount: parseInt(totalAmount) || 0,
      service_type: serviceType,
      ceremony_location: ceremonyLocation || null,
      notes: notes || null,
      internal_notes: internalNotes || null,
    };
    if (pipelineStage === "cerrado" && !serviceCase.closed_at) {
      updates.closed_at = new Date().toISOString();
    }
    const { error } = await supabase.from("service_cases").update(updates).eq("id", serviceCase.id);
    if (error) {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    } else {
      if (serviceCase.lead_id && pipelineStage !== serviceCase.pipeline_stage) {
        await supabase.from("contact_leads").update({ pipeline_stage: pipelineStage } as any).eq("id", serviceCase.lead_id);
      }
      toast({ title: "✅ Caso actualizado" });
      onUpdate();
    }
    setSaving(false);
  };

  const openWhatsApp = () => {
    const v = validateClPhone(serviceCase?.client_phone);
    if (v.ok !== true) {
      toast({
        title: "No se puede abrir WhatsApp",
        description: v.reason,
        variant: "destructive",
      });
      return;
    }
    const nombre = firstName(serviceCase?.client_name);
    const saludo = nombre ? `Hola ${nombre}` : "Hola, buenos días";
    const mensaje = `${saludo}, le saluda Funeraria Santa Margarita 🙏.\n\nNos comunicamos en relación a su caso ${serviceCase.case_number}. Estamos a su disposición para acompañarle con respeto en este momento.\n\n¿En qué podemos ayudarle?`;
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
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{serviceCase.case_number}</span>
          </SheetTitle>
          <p className="text-lg font-semibold">{serviceCase.client_name ?? "Sin nombre"}</p>
          {serviceCase.deceased_name && (
            <p className="text-xs text-muted-foreground">Fallecido/a: <span className="font-medium text-foreground">{serviceCase.deceased_name}</span></p>
          )}
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="w-full grid grid-cols-4 sm:grid-cols-8 h-auto gap-0.5">
            <TabsTrigger value="resumen" className="text-[11px] sm:text-xs px-1.5 py-1.5">Resumen</TabsTrigger>
            <TabsTrigger value="fallecido" className="text-[11px] sm:text-xs px-1.5 py-1.5">Fallecido</TabsTrigger>
            <TabsTrigger value="cotizacion" className="text-[11px] sm:text-xs px-1.5 py-1.5">Cotización</TabsTrigger>
            <TabsTrigger value="pagos" className="text-[11px] sm:text-xs px-1.5 py-1.5">Pagos</TabsTrigger>
            <TabsTrigger value="estados" className="text-[11px] sm:text-xs px-1.5 py-1.5">Estados</TabsTrigger>
            <TabsTrigger value="checklist" className="text-[11px] sm:text-xs px-1.5 py-1.5">Hitos</TabsTrigger>
            <TabsTrigger value="docs" className="text-[11px] sm:text-xs px-1.5 py-1.5">Docs</TabsTrigger>
            <TabsTrigger value="historial" className="text-[11px] sm:text-xs px-1.5 py-1.5">Historial</TabsTrigger>
          </TabsList>

          {/* ----- RESUMEN ----- */}
          <TabsContent value="resumen" className="space-y-5 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Información del Cliente</label>
              {serviceCase.client_phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{serviceCase.client_phone}</div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openWhatsApp}>
                    <ExternalLink className="w-3 h-3 mr-1" />WhatsApp
                  </Button>
                </div>
              )}
              {serviceCase.client_email && (
                <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{serviceCase.client_email}</div>
              )}
              {serviceCase.comuna && (
                <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" />{serviceCase.comuna}</div>
              )}
              <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" />{format(new Date(serviceCase.created_at), "dd MMM yyyy HH:mm", { locale: es })}</div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Etapa del Caso</label>
                <Select value={pipelineStage} onValueChange={setPipelineStage}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Estado de Pago</label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo de Servicio</label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Monto Total (CLP)</label>
                <div className="flex gap-1 mt-1">
                  <Input type="number" className="h-8 text-xs" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="$0" />
                </div>
                {parseInt(totalAmount) > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(parseInt(totalAmount))}</p>}
              </div>
            </div>

            {serviceCase.selected_plan && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Plan Seleccionado</label>
                <Badge variant="secondary" className="mt-1">{serviceCase.selected_plan}</Badge>
              </div>
            )}

            <Separator />

            <CaseTrackingWidget caseId={serviceCase.id} />

            <Separator />

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />Lugar de ceremonia</label>
              <Input className="h-8 text-sm" placeholder="Lugar de ceremonia" value={ceremonyLocation} onChange={e => setCeremonyLocation(e.target.value)} />
            </div>

            {serviceCase.original_message && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Mensaje original del Lead</label>
                <div className="mt-1 p-3 rounded-md bg-muted/50 text-sm">{serviceCase.original_message}</div>
              </div>
            )}

            {serviceCase.ai_summary && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Resumen IA</label>
                <div className="mt-1 p-3 rounded-md bg-primary/5 text-sm">{serviceCase.ai_summary}</div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />Notas del Caso</label>
              <Textarea className="text-sm min-h-[60px]" placeholder="Notas visibles..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Notas Internas (privadas)</label>
              <Textarea className="text-sm min-h-[60px]" placeholder="Notas internas del equipo..." value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
            </div>

            <Button className="w-full" onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />{saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </TabsContent>

          {/* ----- FALLECIDO ----- */}
          <TabsContent value="fallecido" className="mt-4">
            <CaseDeceasedTab caseId={serviceCase.id} initial={serviceCase} onSaved={onUpdate} />
          </TabsContent>

          {/* ----- COTIZACIÓN ----- */}
          <TabsContent value="cotizacion" className="mt-4">
            <CaseQuoteTab caseId={serviceCase.id} onSaved={onUpdate} />
          </TabsContent>

          {/* ----- PAGOS ----- */}
          <TabsContent value="pagos" className="mt-4">
            <CasePaymentsTab
              caseId={serviceCase.id}
              caseNumber={serviceCase.case_number}
              totalAmount={serviceCase.total_amount ?? 0}
              onSaved={onUpdate}
            />
          </TabsContent>

          {/* ----- ESTADOS MÚLTIPLES ----- */}
          <TabsContent value="estados" className="mt-4">
            <CaseStatusTab caseId={serviceCase.id} initial={serviceCase} onSaved={onUpdate} />
          </TabsContent>

          {/* ----- CHECKLIST OPERATIVO ----- */}
          <TabsContent value="checklist" className="mt-4">
            <CaseChecklistTab caseId={serviceCase.id} onChanged={onUpdate} />
          </TabsContent>

          {/* ----- EXPEDIENTE DOCUMENTAL ----- */}
          <TabsContent value="docs" className="mt-4">
            <CaseDocumentsTab caseId={serviceCase.id} />
          </TabsContent>

          {/* ----- BITÁCORA ----- */}
          <TabsContent value="historial" className="mt-4">
            <CaseHistoryTab caseId={serviceCase.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
