import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Pencil, Trash2, Eye, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { usePagination } from "@/hooks/use-pagination";

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
  const { page, pageSize, totalPages, from, to, setPage, setPageSize } = usePagination("obituarios", items.length);
  const paginated = items.slice(from, to + 1);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
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

  const handleGenerateAI = async () => {
    if (!editing.full_name || !editing.death_date) {
      toast({ title: "Complete nombre y fecha de fallecimiento primero", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          type: "obituary_biography",
          context: {
            full_name: editing.full_name,
            birth_date: editing.birth_date,
            death_date: editing.death_date,
            city: editing.city,
            family_names: editing.family_names,
          },
        },
      });
      if (error) throw error;
      if (data?.data) {
        const ai = data.data;
        setEditing(p => ({
          ...p,
          biography: ai.biography || p.biography,
          family_message: ai.family_message || p.family_message,
          meta_title: ai.meta_title || p.meta_title,
          meta_description: ai.meta_description || p.meta_description,
        }));
        toast({ title: "✨ Contenido generado con IA", description: "Revisa y edita antes de guardar." });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast({ title: "Error al generar", description: e.message || "Intente nuevamente", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

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
    <div className={opts?.full ? "sm:col-span-2" : ""}>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Gestión de Obituarios</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{items.length} obituarios registrados</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Nuevo</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No hay obituarios registrados.</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Crear primer obituario</Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="rounded-md border hidden md:block">
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
                {paginated.map(item => (
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
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paginated.map(item => (
              <div key={item.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.full_name}</p>
                  <p className="text-xs text-muted-foreground">{item.city ?? "—"} · {item.death_date}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={item.published} onCheckedChange={() => togglePublished(item.id, item.published)} />
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
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar Obituario" : "Nuevo Obituario"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Biografía</Label>
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={handleGenerateAI}
                  disabled={generating}
                  className="text-xs h-7"
                >
                  {generating ? (
                    <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />Generando...</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1" />Generar con IA</>
                  )}
                </Button>
              </div>
              <Textarea className="mt-1" rows={4} value={(editing.biography as string) ?? ""} onChange={e => setEditing(p => ({ ...p, biography: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">
                La IA generará biografía, mensaje familiar y metadatos SEO basados en los datos ingresados.
              </p>
            </div>
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
