import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Phone, Mail, MapPin, Calendar, DollarSign, Save, ExternalLink, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const [deceasedName, setDeceasedName] = useState("");
  const [ceremonyLocation, setCeremonyLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!serviceCase) return;
    setPipelineStage(serviceCase.pipeline_stage);
    setPaymentStatus(serviceCase.payment_status);
    setTotalAmount(serviceCase.total_amount?.toString() ?? "0");
    setServiceType(serviceCase.service_type ?? "servicio_funerario");
    setDeceasedName(serviceCase.deceased_name ?? "");
    setCeremonyLocation(serviceCase.ceremony_location ?? "");
    setNotes(serviceCase.notes ?? "");
    setInternalNotes(serviceCase.internal_notes ?? "");
  }, [serviceCase?.id]);

  const save = async () => {
    if (!serviceCase) return;
    setSaving(true);
    const updates: any = {
      pipeline_stage: pipelineStage,
      payment_status: paymentStatus,
      total_amount: parseInt(totalAmount) || 0,
      service_type: serviceType,
      deceased_name: deceasedName || null,
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
      // Sync pipeline back to lead
      if (serviceCase.lead_id && pipelineStage !== serviceCase.pipeline_stage) {
        await supabase.from("contact_leads").update({ pipeline_stage: pipelineStage } as any).eq("id", serviceCase.lead_id);
      }
      toast({ title: "✅ Caso actualizado" });
      onUpdate();
    }
    setSaving(false);
  };

  const openWhatsApp = () => {
    if (!serviceCase?.client_phone) return;
    const phone = serviceCase.client_phone.replace(/\D/g, "");
    const nombre = serviceCase.client_name?.split(" ")[0] ?? "";
    const mensaje = `Estimado/a ${nombre}, le saluda Funeraria Santa Margarita 🙏.\n\nNos comunicamos en relación a su caso ${serviceCase.case_number}. Estamos a su disposición.\n\n¿En qué podemos ayudarle?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  };

  if (!serviceCase) return null;

  return (
    <Sheet open={!!serviceCase} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:w-[520px] sm:max-w-[520px] overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{serviceCase.case_number}</span>
          </SheetTitle>
          <p className="text-lg font-semibold">{serviceCase.client_name ?? "Sin nombre"}</p>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Client Info */}
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

          {/* Pipeline & Payment */}
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

          {/* Service & Amount */}
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

          {/* Deceased Info */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />Datos del Difunto</label>
            <Input className="h-8 text-sm" placeholder="Nombre completo del difunto" value={deceasedName} onChange={e => setDeceasedName(e.target.value)} />
            <Input className="h-8 text-sm" placeholder="Lugar de ceremonia" value={ceremonyLocation} onChange={e => setCeremonyLocation(e.target.value)} />
          </div>

          <Separator />

          {/* Original Message */}
          {serviceCase.original_message && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mensaje original del Lead</label>
              <div className="mt-1 p-3 rounded-md bg-muted/50 text-sm">{serviceCase.original_message}</div>
            </div>
          )}

          {/* AI Summary */}
          {serviceCase.ai_summary && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Resumen IA</label>
              <div className="mt-1 p-3 rounded-md bg-blue-50/50 dark:bg-blue-950/30 text-sm">{serviceCase.ai_summary}</div>
            </div>
          )}

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />Notas del Caso</label>
            <Textarea className="text-sm min-h-[60px]" placeholder="Notas visibles..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Notas Internas (privadas)</label>
            <Textarea className="text-sm min-h-[60px]" placeholder="Notas internas del equipo..." value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
          </div>

          {/* Save */}
          <Button className="w-full" onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
