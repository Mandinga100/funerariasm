import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SortableTable, type SortableColumn } from "@/components/admin/SortableTable";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreVertical, Plus, Pencil, Trash2, Eye, Sparkles, Heart, KeyRound } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import AdminFamilyAccess from "@/components/admin/AdminFamilyAccess";

type Memorial = Tables<"memorials">;

const EMPTY: Partial<Memorial> = {
  full_name: "", slug: "", death_date: "", birth_date: "", city: "Santiago",
  biography: "", tribute_text: "", photo_url: "",
  meta_title: "", meta_description: "", published: false,
};

function slugify(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminMemoriales() {
  const [items, setItems] = useState<Memorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Memorial>>(EMPTY);
  const { sorted, sortHandled } = useSortedRows<Memorial>("admin_memoriales", items, {
    death_date: (r) => (r.death_date ? new Date(r.death_date).getTime() : 0),
    created_at: (r) => new Date(r.created_at).getTime(),
    published: (r) => (r.published ? 1 : 0),
  });
  const { page, pageSize, totalPages, from, to, setPage, setPageSize } = usePagination("memoriales", sorted.length);
  const paginated = sorted.slice(from, to + 1);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("memorials").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublished = async (id: string, current: boolean) => {
    const { error } = await supabase.from("memorials").update({
      published: !current, published_at: !current ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: !current ? "Publicado" : "Despublicado" }); load(); }
  };

  const openCreate = () => { setEditing({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (item: Memorial) => { setEditing({ ...item }); setDialogOpen(true); };

  const handleGenerateAI = async () => {
    if (!editing.full_name || !editing.death_date) {
      toast({ title: "Complete nombre y fecha de fallecimiento primero", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          type: "memorial_tribute",
          context: {
            full_name: editing.full_name,
            birth_date: editing.birth_date,
            death_date: editing.death_date,
            city: editing.city,
            biography: editing.biography,
          },
        },
      });
      if (error) throw error;
      if (data?.data) {
        const ai = data.data;
        setEditing(p => ({
          ...p,
          tribute_text: ai.tribute_text || p.tribute_text,
          biography: ai.biography || p.biography,
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
      biography: editing.biography || null, tribute_text: editing.tribute_text || null,
      photo_url: editing.photo_url || null,
      meta_title: editing.meta_title || null, meta_description: editing.meta_description || null,
      published: editing.published ?? false,
      published_at: editing.published ? (editing.published_at || new Date().toISOString()) : null,
    };

    let error;
    if (editing.id) {
      ({ error } = await supabase.from("memorials").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("memorials").insert(payload));
    }
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: editing.id ? "Legado actualizado" : "Legado creado" }); setDialogOpen(false); load(); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el legado de ${name}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("memorials").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Legado eliminado" }); load(); }
  };

  const field = (key: keyof Memorial, label: string, opts?: { type?: string; full?: boolean; textarea?: boolean }) => (
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
          <h1 className="text-xl sm:text-2xl font-bold">Gestión de Legados Eternos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{items.length} legados registrados</p>
        </div>
      </div>

      <Tabs defaultValue="legados" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="legados" className="gap-2">
            <Heart className="w-4 h-4" /> Legados
          </TabsTrigger>
          <TabsTrigger value="accesos" className="gap-2">
            <KeyRound className="w-4 h-4" /> Accesos familiares
          </TabsTrigger>
        </TabsList>

        <TabsContent value="legados" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Nuevo legado</Button>
          </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No hay legados registrados.</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Crear primer legado</Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <SortableTable<Memorial>
              tableKey="admin_memoriales"
              rows={paginated}
              rowKey={(r) => r.id}
              externalSort={sortHandled}
              columns={[
                {
                  key: "full_name",
                  label: "Nombre",
                  defaultWidth: 280,
                  cell: (r) => <span className="font-medium">{r.full_name}</span>,
                },
                { key: "city", label: "Ciudad", defaultWidth: 160, cell: (r) => r.city ?? "—" },
                { key: "death_date", label: "Fallecimiento", defaultWidth: 160, cell: (r) => r.death_date },
                {
                  key: "published",
                  label: "Estado",
                  defaultWidth: 110,
                  accessor: (r) => r.published,
                  cell: (r) => (
                    <Switch checked={r.published} onCheckedChange={() => togglePublished(r.id, r.published)} />
                  ),
                },
                {
                  key: "actions",
                  label: "",
                  sortable: false,
                  resizable: false,
                  defaultWidth: 60,
                  cell: (r) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/legados-eternos/${r.slug}`} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-2" />Ver en web</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r.id, r.full_name)}>
                          <Trash2 className="w-4 h-4 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                } satisfies SortableColumn<Memorial>,
              ]}
            />
          </div>
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
                        <a href={`/legados-eternos/${item.slug}`} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-2" />Ver en web</a>
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
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalCount={items.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel={{ singular: "memorial", plural: "memoriales" }}
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar Legado" : "Nuevo Legado"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {field("full_name", "Nombre completo *")}
            {field("slug", "Slug (URL)")}
            {field("birth_date", "Fecha de nacimiento", { type: "date" })}
            {field("death_date", "Fecha de fallecimiento *", { type: "date" })}
            {field("city", "Ciudad")}
            {field("photo_url", "URL de foto")}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Texto tributo</Label>
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
              <Textarea className="mt-1" rows={4} value={(editing.tribute_text as string) ?? ""} onChange={e => setEditing(p => ({ ...p, tribute_text: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">
                La IA generará tributo, biografía y metadatos SEO basados en los datos ingresados.
              </p>
            </div>
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
