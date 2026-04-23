import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Briefcase, ClipboardList, FileCheck2, Wallet } from "lucide-react";

interface Props {
  caseId: string;
  initial: any;
  onSaved: () => void;
}

const COMMERCIAL = [
  { id: "cotizando", label: "Cotizando", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  { id: "negociando", label: "Negociando", color: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300" },
  { id: "contratado", label: "Contratado", color: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" },
  { id: "perdido", label: "Perdido", color: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" },
];

const OPERATIONAL = [
  { id: "sin_iniciar", label: "Sin iniciar", color: "bg-muted text-muted-foreground" },
  { id: "retiro_programado", label: "Retiro programado", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300" },
  { id: "preparacion", label: "Preparación", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300" },
  { id: "velorio", label: "Velorio", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300" },
  { id: "ceremonia", label: "Ceremonia", color: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300" },
  { id: "finalizado", label: "Finalizado", color: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" },
];

const DOCUMENTAL = [
  { id: "pendiente", label: "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  { id: "incompleto", label: "Incompleto", color: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300" },
  { id: "completo", label: "Completo", color: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" },
];

const FINANCIAL = [
  { id: "sin_pago", label: "Sin pago", color: "bg-muted text-muted-foreground" },
  { id: "abonado", label: "Abonado parcial", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  { id: "pagado", label: "Pagado total", color: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" },
  { id: "moroso", label: "Moroso", color: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" },
];

type Field = "commercial_status" | "operational_status" | "documental_status" | "financial_status";

const find = (opts: { id: string; label: string; color: string }[], id: string) => opts.find(o => o.id === id);

/** Estados independientes por área (comercial / operativo / documental / financiero). */
export default function CaseStatusTab({ caseId, initial, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    commercial_status: initial?.commercial_status ?? "cotizando",
    operational_status: initial?.operational_status ?? "sin_iniciar",
    documental_status: initial?.documental_status ?? "pendiente",
    financial_status: initial?.financial_status ?? "sin_pago",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      commercial_status: initial?.commercial_status ?? "cotizando",
      operational_status: initial?.operational_status ?? "sin_iniciar",
      documental_status: initial?.documental_status ?? "pendiente",
      financial_status: initial?.financial_status ?? "sin_pago",
    });
  }, [initial?.id]);

  const set = (k: Field, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("service_cases").update(form).eq("id", caseId);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Estados actualizados" }); onSaved(); }
  };

  const Row = ({
    icon: Icon, label, value, options, onChange,
  }: { icon: typeof Briefcase; label: string; value: string; options: typeof COMMERCIAL; onChange: (v: string) => void }) => {
    const cur = find(options, value);
    return (
      <div className="rounded-md border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-muted-foreground" />{label}</Label>
          {cur && <Badge variant="secondary" className={`text-[10px] ${cur.color}`}>{cur.label}</Badge>}
        </div>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Cada área avanza independiente. Los cambios se registran automáticamente en la bitácora.</p>
      <Row icon={Briefcase} label="Estado comercial" value={form.commercial_status} options={COMMERCIAL} onChange={v => set("commercial_status", v)} />
      <Row icon={ClipboardList} label="Estado operativo" value={form.operational_status} options={OPERATIONAL} onChange={v => set("operational_status", v)} />
      <Row icon={FileCheck2} label="Estado documental" value={form.documental_status} options={DOCUMENTAL} onChange={v => set("documental_status", v)} />
      <Row icon={Wallet} label="Estado financiero" value={form.financial_status} options={FINANCIAL} onChange={v => set("financial_status", v)} />
      <Button onClick={save} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />{saving ? "Guardando..." : "Guardar estados"}
      </Button>
    </div>
  );
}
