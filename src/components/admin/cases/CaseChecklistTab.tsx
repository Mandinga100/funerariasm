import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Wand2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Milestone {
  id: string;
  case_id: string;
  milestone_key: string;
  title: string;
  description: string | null;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  position: number;
  notes: string | null;
}

interface Props {
  caseId: string;
  onChanged?: () => void;
}

/** Hitos operativos estándar de un servicio funerario chileno. */
const DEFAULT_MILESTONES: Array<{ key: string; title: string }> = [
  { key: "retiro_cuerpo", title: "Retiro del cuerpo" },
  { key: "documentos_legales", title: "Documentos legales (defunción/pase)" },
  { key: "preparacion", title: "Preparación / tanatopraxia" },
  { key: "traslado_velorio", title: "Traslado a velorio" },
  { key: "velorio", title: "Velorio" },
  { key: "ceremonia", title: "Ceremonia religiosa" },
  { key: "sepultacion_cremacion", title: "Sepultación / cremación" },
  { key: "entrega_cenizas", title: "Entrega de cenizas (si aplica)" },
  { key: "cierre_admin", title: "Cierre administrativo" },
];

export default function CaseChecklistTab({ caseId, onChanged }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("case_milestones")
      .select("*")
      .eq("case_id", caseId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    setItems((data as Milestone[]) ?? []);
    setLoading(false);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const seedDefaults = async () => {
    if (items.length > 0) return;
    setSeeding(true);
    const rows = DEFAULT_MILESTONES.map((m, i) => ({
      case_id: caseId, milestone_key: m.key, title: m.title, position: i, status: "pendiente",
    }));
    const { error } = await supabase.from("case_milestones").insert(rows);
    setSeeding(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Checklist generado" }); load(); onChanged?.(); }
  };

  const toggle = async (m: Milestone) => {
    const completed = m.status === "completado";
    const { error } = await supabase.from("case_milestones").update({
      status: completed ? "pendiente" : "completado",
      completed_at: completed ? null : new Date().toISOString(),
    }).eq("id", m.id);
    if (error) toast({ title: "Error", variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("case_milestones").delete().eq("id", id);
    if (error) toast({ title: "Error", variant: "destructive" });
    else load();
  };

  const add = async () => {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("case_milestones").insert({
      case_id: caseId,
      milestone_key: `custom_${Date.now()}`,
      title: newTitle.trim(),
      position: items.length,
      status: "pendiente",
    });
    if (error) toast({ title: "Error", variant: "destructive" });
    else { setNewTitle(""); load(); }
  };

  const completed = items.filter(i => i.status === "completado").length;
  const total = items.length;

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {total === 0 ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-muted-foreground">No hay hitos creados.</p>
          <Button onClick={seedDefaults} disabled={seeding} variant="outline">
            <Wand2 className="w-4 h-4 mr-2" />{seeding ? "Generando..." : "Generar checklist estándar"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{completed}/{total} completados</Badge>
            <div className="h-1.5 flex-1 ml-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
            </div>
          </div>
          <ul className="space-y-1.5">
            {items.map(m => (
              <li key={m.id} className="flex items-start gap-2 rounded-md border p-2.5">
                <Checkbox checked={m.status === "completado"} onCheckedChange={() => toggle(m)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${m.status === "completado" ? "line-through text-muted-foreground" : ""}`}>{m.title}</p>
                  {m.completed_at && (
                    <p className="text-[10px] text-muted-foreground">Completado {format(new Date(m.completed_at), "dd MMM HH:mm", { locale: es })}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => remove(m.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Input placeholder="Agregar hito personalizado..." value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} className="h-8 text-sm" />
        <Button onClick={add} size="sm" disabled={!newTitle.trim()}><Plus className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
