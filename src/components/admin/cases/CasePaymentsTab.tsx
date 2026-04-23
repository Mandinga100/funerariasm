import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, CheckCircle2, XCircle, Clock, Wallet, ExternalLink, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";

interface PaymentRow {
  id: string;
  transaction_ref: string;
  amount: number;
  status: string;
  payment_type: string;
  payment_subtype: string | null;
  full_name: string;
  email: string;
  phone: string;
  notes: string | null;
  proof_url: string | null;
  proof_filename: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface CasePaymentsTabProps {
  caseId: string;
  caseNumber: string;
  totalAmount: number;
  onSaved?: () => void;
}

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  initiated: { label: "Iniciado", color: "bg-muted text-muted-foreground", icon: Clock },
  transfer_reported: { label: "Reportada", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300", icon: Clock },
  pending_review: { label: "En revisión", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  rejected: { label: "Rechazado", color: "bg-destructive/15 text-destructive", icon: XCircle },
  refunded: { label: "Reembolsado", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300", icon: XCircle },
};

const PAYMENT_TYPES = [
  { id: "servicio", label: "Servicio funerario" },
  { id: "abono", label: "Abono" },
  { id: "saldo", label: "Pago de saldo" },
  { id: "anticipo", label: "Anticipo" },
  { id: "otro", label: "Otro" },
];

const PAYMENT_SUBTYPES = [
  { id: "transferencia", label: "Transferencia bancaria" },
  { id: "efectivo", label: "Efectivo" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "cheque", label: "Cheque" },
  { id: "deposito", label: "Depósito" },
];

const fmt = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export default function CasePaymentsTab({ caseId, caseNumber, totalAmount, onSaved }: CasePaymentsTabProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [fAmount, setFAmount] = useState("");
  const [fType, setFType] = useState("abono");
  const [fSubtype, setFSubtype] = useState("transferencia");
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fRut, setFRut] = useState("");
  const [fNotes, setFNotes] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("id,transaction_ref,amount,status,payment_type,payment_subtype,full_name,email,phone,notes,proof_url,proof_filename,created_at,reviewed_at,reviewed_by")
      .eq("case_reference", caseNumber)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error cargando pagos", description: error.message, variant: "destructive" });
    } else {
      setPayments((data ?? []) as PaymentRow[]);
    }
    setLoading(false);
  }, [caseNumber, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`case-payments-${caseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions", filter: `case_reference=eq.${caseNumber}` }, () => {
        fetch();
        onSaved?.();
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [caseId, caseNumber, fetch, onSaved]);

  const totals = useMemo(() => {
    const confirmed = payments.filter(p => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
    const pending = payments.filter(p => ["initiated", "transfer_reported", "pending_review"].includes(p.status)).reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, totalAmount - confirmed);
    const pct = totalAmount > 0 ? Math.min(100, Math.round((confirmed / totalAmount) * 100)) : 0;
    return { confirmed, pending, balance, pct };
  }, [payments, totalAmount]);

  const resetForm = () => {
    setFAmount(""); setFType("abono"); setFSubtype("transferencia");
    setFName(""); setFEmail(""); setFPhone(""); setFRut(""); setFNotes("");
    setShowForm(false);
  };

  // Reglas: tipos que exigen comprobante adjunto en notas (referencia)
  const requiresProofRef = ["transferencia", "deposito", "cheque"].includes(fSubtype);
  const requiresMethod = true; // método siempre obligatorio

  const validatePayment = (amt: number): string | null => {
    if (isNaN(amt)) return "Ingresa un monto válido";
    if (amt <= 0) return "El monto debe ser mayor a 0";
    if (amt < 1000) return "El monto mínimo es $1.000";
    // No permitir superar saldo pendiente (suma de confirmados + nuevo)
    // Tolerancia: si total_amount es 0 (no cotizado), permitimos cualquier monto
    if (totalAmount > 0 && amt > totals.balance) {
      return `El monto supera el saldo pendiente (${fmt(totals.balance)}). Ajusta o registra como abono parcial.`;
    }
    if (!fName.trim()) return "Falta nombre del pagador";
    if (fName.trim().length < 3) return "El nombre debe tener al menos 3 caracteres";
    if (requiresMethod && !fSubtype) return "Selecciona un método de pago";
    if (!fType) return "Selecciona el tipo de pago";
    if (requiresProofRef && !fNotes.trim()) {
      return "Para transferencia/depósito/cheque indica la referencia o N° de comprobante en Notas";
    }
    if (fEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail.trim())) {
      return "Email inválido";
    }
    return null;
  };

  const createPayment = async () => {
    const amt = parseInt(fAmount);
    const error = validatePayment(amt);
    if (error) {
      toast({ title: "Validación", description: error, variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("payment_transactions").insert({
      case_reference: caseNumber,
      payment_type: fType,
      payment_subtype: fSubtype,
      amount: amt,
      currency: "CLP",
      full_name: fName.trim(),
      email: fEmail.trim() || "sin@registro.cl",
      phone: fPhone.trim() || "+56000000000",
      rut: fRut.trim() || "00.000.000-0",
      notes: fNotes.trim() || null,
      status: "pending_review",
      metadata: { source: "crm_case_tab" },
    });
    if (error) {
      toast({ title: "No se pudo registrar el pago", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "💰 Pago registrado", description: "Pendiente de confirmación" });
      resetForm();
      await fetch();
      onSaved?.();
    }
    setCreating(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("payment_transactions")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userData.user?.id ?? null,
      })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const labels: Record<string, string> = {
        confirmed: "✅ Pago confirmado y aplicado al caso",
        rejected: "🚫 Pago rechazado",
        refunded: "↩️ Pago marcado como reembolsado",
      };
      toast({ title: labels[status] ?? "Estado actualizado" });
      await fetch();
      onSaved?.();
    }
  };

  const deletePayment = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("payment_transactions").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🗑️ Pago eliminado" });
      await fetch();
      onSaved?.();
    }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />Cargando pagos…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen financiero */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4" />Resumen financiero</CardTitle>
          <CardDescription className="text-xs">Avance de pagos del caso {caseNumber}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Total caso</p>
              <p className="text-sm font-semibold">{fmt(totalAmount)}</p>
            </div>
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase">Pagado</p>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{fmt(totals.confirmed)}</p>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase">Saldo</p>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{fmt(totals.balance)}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{totals.pct}% pagado</span>
              {totals.pending > 0 && <span>{fmt(totals.pending)} pendiente revisión</span>}
            </div>
            <Progress value={totals.pct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Formulario nuevo pago */}
      {showForm ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registrar pago</CardTitle>
            <CardDescription className="text-xs">Se registra como "En revisión" hasta que se confirme.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Monto (CLP) *</label>
                <Input type="number" min={0} className="h-8 text-xs mt-1" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Tipo</label>
                <Select value={fType} onValueChange={setFType}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Método</label>
                <Select value={fSubtype} onValueChange={setFSubtype}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SUBTYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">RUT pagador</label>
                <Input className="h-8 text-xs mt-1" value={fRut} onChange={e => setFRut(e.target.value)} placeholder="12.345.678-9" />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">Nombre del pagador *</label>
                <Input className="h-8 text-xs mt-1" value={fName} onChange={e => setFName(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Email</label>
                <Input type="email" className="h-8 text-xs mt-1" value={fEmail} onChange={e => setFEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Teléfono</label>
                <Input className="h-8 text-xs mt-1" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+56 9 ..." />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">Notas</label>
                <Textarea className="text-xs mt-1 min-h-[50px]" value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Referencia bancaria, observaciones..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={resetForm}>Cancelar</Button>
              <Button size="sm" onClick={createPayment} disabled={creating}>
                {creating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Registrar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button size="sm" variant="outline" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />Registrar nuevo pago
        </Button>
      )}

      {/* Listado de pagos */}
      {payments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <Wallet className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aún no hay pagos registrados para este caso.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map(p => {
            const meta = STATUS_META[p.status] ?? STATUS_META.initiated;
            const Icon = meta.icon;
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{fmt(p.amount)}</span>
                        <Badge className={cn("text-[10px]", meta.color)}>
                          <Icon className="w-3 h-3 mr-0.5" />{meta.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{p.payment_type}</Badge>
                        {p.payment_subtype && <Badge variant="outline" className="text-[10px]">{p.payment_subtype}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.full_name} · {format(new Date(p.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">{p.transaction_ref}</p>
                      {p.notes && <p className="text-xs mt-1 p-2 rounded bg-muted/50">{p.notes}</p>}
                      {p.proof_url && (
                        <a href={p.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1">
                          <FileText className="w-3 h-3" />{p.proof_filename ?? "Ver comprobante"}<ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {["initiated", "transfer_reported", "pending_review"].includes(p.status) && (
                        <>
                          <Button size="sm" className="h-7 text-[11px]" onClick={() => updateStatus(p.id, "confirmed")}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />Confirmar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => updateStatus(p.id, "rejected")}>
                            <XCircle className="w-3 h-3 mr-1" />Rechazar
                          </Button>
                        </>
                      )}
                      {p.status === "confirmed" && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => updateStatus(p.id, "refunded")}>
                          ↩️ Reembolsar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Separator />
          <p className="text-[10px] text-muted-foreground text-center">
            Los montos confirmados se aplican automáticamente al caso (estado financiero y pagado).
          </p>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar este pago?"
        description="Se eliminará el registro de pago. El monto pagado del caso se recalculará automáticamente."
        onConfirm={deletePayment}
      />
    </div>
  );
}
