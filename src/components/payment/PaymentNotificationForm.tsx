import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  PaymentType, PAYMENT_TYPES, AMOUNT_LIMITS, PLANS, SERVICE_SUBTYPES, PLANIFICATION_SUBTYPES,
  ALLOWED_PROOF_TYPES, MAX_PROOF_SIZE_BYTES, MAX_PROOF_SIZE_MB, validateRut, formatClp,
} from "@/lib/payment-config";

const schema = z.object({
  full_name: z.string().trim().min(3, "Mínimo 3 caracteres").max(120),
  rut: z.string().trim().min(7, "RUT inválido").max(12).refine(validateRut, "RUT inválido"),
  email: z.string().trim().email("Correo inválido").max(255),
  phone: z.string().trim().min(8, "Teléfono inválido").max(15).regex(/^[+\d\s()-]+$/, "Formato inválido"),
  amount: z.coerce.number().positive("Monto debe ser positivo"),
  payment_subtype: z.string().optional(),
  plan_id: z.string().optional(),
  case_reference: z.string().max(50).optional(),
  donor_message: z.string().max(500).optional(),
  is_anonymous: z.boolean().optional(),
  comment: z.string().max(500).optional(),
  honeypot: z.string().max(0, "Bot detected"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  paymentType: PaymentType;
  preselectedPlan?: string;
  preselectedAmount?: number;
}

const PaymentNotificationForm = ({ paymentType, preselectedPlan, preselectedAmount }: Props) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const formLoadedAt = useRef(new Date().toISOString());
  const submitCount = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limits = AMOUNT_LIMITS[paymentType];

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      rut: "",
      email: "",
      phone: "",
      amount: preselectedAmount || 0,
      payment_subtype: "",
      plan_id: preselectedPlan || "",
      case_reference: "",
      donor_message: "",
      is_anonymous: false,
      comment: "",
      honeypot: "",
    },
  });

  // When plan changes, set amount
  const selectedPlanId = form.watch("plan_id");
  useEffect(() => {
    if (paymentType === "planificacion" && selectedPlanId) {
      const plan = PLANS.find((p) => p.id === selectedPlanId);
      if (plan) form.setValue("amount", plan.price);
    }
  }, [selectedPlanId, paymentType, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      setProofError("Tipo de archivo no permitido. Use PDF, JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_PROOF_SIZE_BYTES) {
      setProofError(`El archivo excede ${MAX_PROOF_SIZE_MB} MB.`);
      return;
    }
    setProofFile(file);
  };

  const onSubmit = async (data: FormData) => {
    // Anti-spam: honeypot
    if (data.honeypot) return;

    // Rate limit: max 3 submissions per session
    submitCount.current++;
    if (submitCount.current > 3) {
      toast({ title: "Demasiados intentos", description: "Por favor espere unos minutos.", variant: "destructive" });
      return;
    }

    // Time check: form must be open at least 5 seconds
    const elapsed = Date.now() - new Date(formLoadedAt.current).getTime();
    if (elapsed < 5000) {
      toast({ title: "Envío demasiado rápido", description: "Por favor revise sus datos.", variant: "destructive" });
      return;
    }

    // Amount range validation
    if (data.amount < limits.min || data.amount > limits.max) {
      toast({ title: "Monto fuera de rango", description: `El monto debe estar entre ${formatClp(limits.min)} y ${formatClp(limits.max)}.`, variant: "destructive" });
      return;
    }

    // Plan amount mismatch check
    if (paymentType === "planificacion" && data.plan_id) {
      const plan = PLANS.find((p) => p.id === data.plan_id);
      if (plan && data.amount !== plan.price) {
        toast({ title: "Monto no coincide con el plan", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      let proofUrl: string | null = null;
      let proofFilename: string | null = null;

      // Upload proof if exists
      if (proofFile) {
        const ext = proofFile.name.split(".").pop()?.toLowerCase() || "bin";
        const safeName = `${crypto.randomUUID()}.${ext}`;
        const path = `${paymentType}/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(path, proofFile, { contentType: proofFile.type, upsert: false });

        if (uploadError) throw uploadError;
        proofUrl = path;
        proofFilename = safeName;
      }

      const planObj = data.plan_id ? PLANS.find((p) => p.id === data.plan_id) : null;

      const { error } = await supabase.from("payment_transactions").insert({
        payment_type: paymentType,
        payment_subtype: data.payment_subtype || null,
        full_name: data.full_name.trim(),
        rut: data.rut.replace(/[.\-]/g, "").toUpperCase(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        amount: data.amount,
        plan_id: data.plan_id || null,
        plan_name: planObj?.name || null,
        case_reference: data.case_reference || null,
        donor_display_name: data.is_anonymous ? "Anónimo" : data.full_name.trim(),
        is_anonymous: data.is_anonymous || false,
        donor_message: data.donor_message || null,
        proof_url: proofUrl,
        proof_filename: proofFilename,
        status: proofUrl ? "proof_uploaded" : "transfer_reported",
        form_loaded_at: formLoadedAt.current,
        honeypot_triggered: false,
        metadata: { comment: data.comment || null },
      });

      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Notificación enviada", description: "Revisaremos tu pago a la brevedad." });
    } catch (err: any) {
      console.error("Payment submission error:", err);
      toast({ title: "Error al enviar", description: "Intenta nuevamente o contáctanos por WhatsApp.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
        <h3 className="text-xl font-semibold text-primary font-playfair">Notificación recibida</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Hemos registrado tu transferencia. Nuestro equipo la verificará y te contactará para confirmar.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Honeypot - invisible */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <input tabIndex={-1} {...form.register("honeypot")} autoComplete="off" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="full_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo *</FormLabel>
              <FormControl><Input placeholder="Nombre y apellido" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="rut" render={({ field }) => (
            <FormItem>
              <FormLabel>RUT *</FormLabel>
              <FormControl><Input placeholder="12345678-K" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico *</FormLabel>
              <FormControl><Input type="email" placeholder="correo@ejemplo.cl" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono *</FormLabel>
              <FormControl><Input placeholder="+56 9 1234 5678" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Service-specific fields */}
        {paymentType === "servicio" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="payment_subtype" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de pago</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {SERVICE_SUBTYPES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="case_reference" render={({ field }) => (
              <FormItem>
                <FormLabel>Nº de caso o referencia</FormLabel>
                <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        )}

        {/* Planification-specific fields */}
        {paymentType === "planificacion" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="payment_subtype" render={({ field }) => (
              <FormItem>
                <FormLabel>Modalidad</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {PLANIFICATION_SUBTYPES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="plan_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Plan seleccionado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un plan" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {PLANS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.display}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        )}

        {/* Donation-specific fields */}
        {paymentType === "donacion" && (
          <div className="space-y-4">
            <FormField control={form.control} name="donor_message" render={({ field }) => (
              <FormItem>
                <FormLabel>Mensaje (opcional)</FormLabel>
                <FormControl><Textarea placeholder="Un mensaje de apoyo..." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="is_anonymous" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0 cursor-pointer">Deseo que mi donación sea anónima</FormLabel>
              </FormItem>
            )} />
          </div>
        )}

        {/* Amount */}
        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem>
            <FormLabel>Monto transferido (CLP) *</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Ej: 1290000"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                readOnly={paymentType === "planificacion" && !!selectedPlanId}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Rango permitido: {formatClp(limits.min)} – {formatClp(limits.max)}
            </p>
            <FormMessage />
          </FormItem>
        )} />

        {/* Comment */}
        <FormField control={form.control} name="comment" render={({ field }) => (
          <FormItem>
            <FormLabel>Comentario adicional</FormLabel>
            <FormControl><Textarea placeholder="Información adicional..." rows={2} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* File upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Comprobante de transferencia (opcional)</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/60 rounded-lg p-6 text-center cursor-pointer hover:border-gold/50 transition-colors"
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {proofFile ? proofFile.name : "Haz clic para subir (PDF, JPG, PNG, WebP · máx 5 MB)"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
            />
          </div>
          {proofError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> {proofError}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gold hover:bg-gold/90 text-primary-foreground h-12 text-base"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</> : "Informar transferencia"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Tu pago será verificado manualmente por nuestro equipo. Te contactaremos para confirmar.
        </p>
      </form>
    </Form>
  );
};

export default PaymentNotificationForm;
