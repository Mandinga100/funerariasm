import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, User } from "lucide-react";

interface Props {
  caseId: string;
  initial: any;
  onSaved: () => void;
}

const GENDERS = [
  { id: "femenino", label: "Femenino" },
  { id: "masculino", label: "Masculino" },
  { id: "otro", label: "Otro" },
  { id: "no_especificado", label: "No especificado" },
];

const RELATIONSHIPS = [
  "Padre", "Madre", "Cónyuge", "Hijo/a", "Hermano/a", "Abuelo/a", "Nieto/a", "Tío/a", "Otro familiar", "Conocido",
];

/** Datos del fallecido asociados al caso. */
export default function CaseDeceasedTab({ caseId, initial, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    deceased_name: initial?.deceased_name ?? "",
    deceased_rut: initial?.deceased_rut ?? "",
    deceased_gender: initial?.deceased_gender ?? "",
    deceased_relationship: initial?.deceased_relationship ?? "",
    deceased_birth_date: initial?.deceased_birth_date ?? "",
    deceased_death_date: initial?.deceased_death_date ?? "",
    death_place: initial?.death_place ?? "",
    death_cause: initial?.death_cause ?? "",
    requires_autopsy: !!initial?.requires_autopsy,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      deceased_name: initial?.deceased_name ?? "",
      deceased_rut: initial?.deceased_rut ?? "",
      deceased_gender: initial?.deceased_gender ?? "",
      deceased_relationship: initial?.deceased_relationship ?? "",
      deceased_birth_date: initial?.deceased_birth_date ?? "",
      deceased_death_date: initial?.deceased_death_date ?? "",
      death_place: initial?.death_place ?? "",
      death_cause: initial?.death_cause ?? "",
      requires_autopsy: !!initial?.requires_autopsy,
    });
  }, [initial?.id]);

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload: any = {
      deceased_name: form.deceased_name || null,
      deceased_rut: form.deceased_rut || null,
      deceased_gender: form.deceased_gender || null,
      deceased_relationship: form.deceased_relationship || null,
      deceased_birth_date: form.deceased_birth_date || null,
      deceased_death_date: form.deceased_death_date || null,
      death_place: form.death_place || null,
      death_cause: form.death_cause || null,
      requires_autopsy: form.requires_autopsy,
    };
    const { error } = await supabase.from("service_cases").update(payload).eq("id", caseId);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Datos del fallecido guardados" }); onSaved(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <User className="w-4 h-4 text-muted-foreground" /> Identificación
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nombre completo</Label>
          <Input value={form.deceased_name} onChange={e => set("deceased_name", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">RUT</Label>
          <Input value={form.deceased_rut} onChange={e => set("deceased_rut", e.target.value)} placeholder="12.345.678-9" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Género</Label>
          <Select value={form.deceased_gender || undefined} onValueChange={v => set("deceased_gender", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{GENDERS.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Parentesco con responsable</Label>
          <Select value={form.deceased_relationship || undefined} onValueChange={v => set("deceased_relationship", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha nacimiento</Label>
          <Input type="date" value={form.deceased_birth_date ?? ""} onChange={e => set("deceased_birth_date", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha defunción</Label>
          <Input type="date" value={form.deceased_death_date ?? ""} onChange={e => set("deceased_death_date", e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Lugar de fallecimiento</Label>
        <Input value={form.death_place} onChange={e => set("death_place", e.target.value)} placeholder="Hospital / domicilio / dirección" className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Causa de fallecimiento</Label>
        <Input value={form.death_cause} onChange={e => set("death_cause", e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label className="text-sm">Requiere autopsia</Label>
          <p className="text-xs text-muted-foreground">Activa si SML o Servicio de Salud retiene el cuerpo.</p>
        </div>
        <Switch checked={form.requires_autopsy} onCheckedChange={v => set("requires_autopsy", v)} />
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />{saving ? "Guardando..." : "Guardar fallecido"}
      </Button>
    </div>
  );
}
