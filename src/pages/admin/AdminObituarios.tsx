import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExternalLink, MoreVertical, Plus, Pencil, Trash2, Eye } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Obituary = Tables<"obituaries">;

const EMPTY: Partial<Obituary> = {
  full_name: "", slug: "", death_date: "", birth_date: "", city: "Santiago",
  biography: "", photo_url: "", wake_location: "", wake_schedule: "",
  ceremony_location: "", ceremony_schedule: "", family_message: "", family_names: "",
  meta_title: "", meta_description: "", published: false,
};

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminObituarios() {
  const [items, setItems] = useState<Obituary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Obituary>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("obituaries").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublished = async (id: string, current: boolean) => {
    const { error } = await supabase.from("obituaries").update({
      published: !current, published_at: !current ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: !current ? "Publicado" : "Despublicado" }); load(); }
  };

  const openCreate = () => { setEditing({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (item: Obituary) => { setEditing({ ...item }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing.full_name || !editing.death_date) {
      toast({ title: "Campos requeridos", description: "Nombre y fecha de fallecimiento son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = editing.slug || slugify(editing.full_name);
    const payload = {
      full_name: editing.full_name!, slug, death_date: editing.death_date!,
      birth_date: editing.birth_date || null, city: editing.city || "Santiago",
      biography: editing.biography || null, photo_url: editing.photo_url || null,
      wake_location: editing.wake_location || null, wake_schedule: editing.wake_schedule || null,
      ceremony_location: editing.ceremony_location || null, ceremony_schedule: editing.ceremony_schedule || null,
      family_message: editing.family_message || null, family_names: editing.family_names || null,
      meta_title: editing.meta_title || null, meta_description: editing.meta_description || null,
      published: editing.published ?? false,
      published_at: editing.published ? (editing.published_at || new Date().toISOString()) : null,
    };

    let error;
    if (editing.id) {
      ({ error } = await supabase.from("obituaries").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("obituaries").insert(payload));
    }
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: editing.id ? "Obituario actualizado" : "Obituario creado" }); setDialogOpen(false); load(); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el obituario de ${name}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("obituaries").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Obituario eliminado" }); load(); }
  };

  const field = (key: keyof Obituary, label: string, opts?: { type?: string; full?: boolean; textarea?: boolean }) => (
    <div className={opts?.full ? "col-span-2" : ""}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {opts?.textarea ? (
        <Textarea className="mt-1" rows={4} value={(editing[key] as string) ?? ""} onChange={e => setEditing(p => ({ ...p, [key]: e.target.value }))} />
      ) : (
        <Input className="mt-1" type={opts?.type ?? "text"} value={(editing[key] as string) ?? ""} onChange={e => setEditing(p => ({ ...p, [key]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Obituarios</h1>
          <p className="text-sm text-muted-foreground">{items.length} obituarios registrados</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nuevo Obituario</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No hay obituarios registrados.</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Crear primer obituario</Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Fallecimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.full_name}</TableCell>
                  <TableCell>{item.city ?? "—"}</TableCell>
                  <TableCell>{item.death_date}</TableCell>
                  <TableCell>
                    <Switch checked={item.published} onCheckedChange={() => togglePublished(item.id, item.published)} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(item)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/obituarios/${item.slug}`} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-2" />Ver en web</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id, item.full_name)}>
                          <Trash2 className="w-4 h-4 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar Obituario" : "Nuevo Obituario"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {field("full_name", "Nombre completo *")}
            {field("slug", "Slug (URL)")}
            {field("birth_date", "Fecha de nacimiento", { type: "date" })}
            {field("death_date", "Fecha de fallecimiento *", { type: "date" })}
            {field("city", "Ciudad")}
            {field("photo_url", "URL de foto")}
            {field("wake_location", "Lugar del velatorio")}
            {field("wake_schedule", "Horario del velatorio")}
            {field("ceremony_location", "Lugar de la ceremonia")}
            {field("ceremony_schedule", "Horario de la ceremonia")}
            {field("family_names", "Nombres de la familia", { full: true })}
            {field("family_message", "Mensaje de la familia", { full: true, textarea: true })}
            {field("biography", "Biografía", { full: true, textarea: true })}
            {field("meta_title", "Meta título (SEO)")}
            {field("meta_description", "Meta descripción (SEO)")}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing.id ? "Actualizar" : "Crear"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
