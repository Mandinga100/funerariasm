import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const DOC_TYPES = [
  { id: "certificado_defuncion", label: "Certificado de defunción" },
  { id: "pase_sepultacion", label: "Pase de sepultación" },
  { id: "autorizacion_cremacion", label: "Autorización de cremación" },
  { id: "cedula_fallecido", label: "Cédula del fallecido" },
  { id: "cedula_responsable", label: "Cédula del responsable" },
  { id: "contrato_servicio", label: "Contrato de servicio" },
  { id: "factura_boleta", label: "Factura / boleta" },
  { id: "comprobante_pago", label: "Comprobante de pago" },
  { id: "convenio", label: "Convenio empresa/institución" },
  { id: "otro", label: "Otro" },
];

const STATUSES = [
  { id: "pendiente", label: "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  { id: "recibido", label: "Recibido", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300" },
  { id: "validado", label: "Validado", color: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" },
  { id: "rechazado", label: "Rechazado", color: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" },
];

interface Doc {
  id: string;
  document_type: string;
  document_name: string;
  status: string;
  validated_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  caseId: string;
}

/** Expediente documental tipado del caso. */
export default function CaseDocumentsTab({ caseId }: Props) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("");
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("case_documents")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
    setLoading(false);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newType || !newName.trim()) {
      toast({ title: "Faltan datos", description: "Tipo y nombre son obligatorios", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("case_documents").insert({
      case_id: caseId,
      document_type: newType,
      document_name: newName.trim(),
      status: "pendiente",
      uploaded_by: u.user?.id ?? null,
    });
    setAdding(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setNewType(""); setNewName(""); load(); }
  };

  const setStatus = async (d: Doc, status: string) => {
    const updates: any = { status };
    if (status === "validado") {
      const { data: u } = await supabase.auth.getUser();
      updates.validated_at = new Date().toISOString();
      updates.validated_by = u.user?.id ?? null;
    }
    const { error } = await supabase.from("case_documents").update(updates).eq("id", d.id);
    if (error) toast({ title: "Error", variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("case_documents").delete().eq("id", id);
    if (error) toast({ title: "Error", variant: "destructive" });
    else load();
  };

  const badge = (status: string) => {
    const s = STATUSES.find(x => x.id === status);
    return s ? <Badge variant="secondary" className={`text-[10px] ${s.color}`}>{s.label}</Badge> : <Badge variant="secondary">{status}</Badge>;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {/* Agregar nuevo */}
      <div className="rounded-md border p-3 space-y-2 bg-muted/30">
        <Label className="text-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Agregar documento</Label>
        <Select value={newType || undefined} onValueChange={setNewType}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Tipo de documento" /></SelectTrigger>
          <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input placeholder="Nombre / referencia" value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-sm" />
          <Button onClick={add} size="sm" disabled={adding || !newType || !newName.trim()}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Sin documentos registrados.</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map(d => {
            const t = DOC_TYPES.find(x => x.id === d.document_type);
            return (
              <li key={d.id} className="rounded-md border p-2.5 space-y-1.5">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.document_name}</p>
                    <p className="text-[11px] text-muted-foreground">{t?.label ?? d.document_type}</p>
                  </div>
                  {badge(d.status)}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => remove(d.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <Select value={d.status} onValueChange={v => setStatus(d, v)}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {d.validated_at && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-primary" />
                      Validado {format(new Date(d.validated_at), "dd/MM HH:mm", { locale: es })}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
