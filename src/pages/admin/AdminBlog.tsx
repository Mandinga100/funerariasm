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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Pencil, Trash2, Eye, Sparkles, Wand2 } from "lucide-react";
import { BLOG_CATEGORIES } from "@/lib/blog-categories";
import { AIActionTooltip } from "@/components/admin/AIActionTooltip";
import type { Tables } from "@/integrations/supabase/types";

type BlogPost = Tables<"blog_posts">;

const EMPTY: Partial<BlogPost> = {
  title: "", slug: "", content: "", excerpt: "", category: "",
  cover_image: "", author_name: "Funeraria Santa Margarita",
  meta_title: "", meta_description: "", tags: [], published: false,
};

function slugify(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BlogPost>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sanitizing, setSanitizing] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSanitizeAll = async () => {
    if (!confirm("Esto sanea TODOS los blogs publicados (limpia '…' en respuestas cortas e inyecta la sección 'Por qué elegir Funeraria Santa Margarita' donde falte). La operación es idempotente. ¿Continuar?")) return;
    setSanitizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sanitize-blog-structure", { body: {} });
      if (error) throw error;
      toast({
        title: "Saneamiento completado",
        description: `Actualizados: ${data?.changed ?? 0} · Sin cambios: ${data?.unchanged ?? 0} · Errores: ${data?.errors ?? 0}`,
      });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSanitizing(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublished = async (id: string, val: boolean) => {
    const update = val
      ? { published: true, published_at: new Date().toISOString() }
      : { published: false, published_at: null as string | null };
    const { error } = await supabase.from("blog_posts").update(update).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const openCreate = () => { setEditing({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (p: BlogPost) => { setEditing({ ...p }); setDialogOpen(true); };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      toast({ title: "Ingrese un tema", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { type: "blog", context: { topic: aiTopic, category: editing.category || "general" } },
      });
      if (error) throw error;
      if (data?.data) {
        const ai = data.data;
        setEditing(p => ({
          ...p,
          title: ai.title || p.title,
          slug: ai.slug || p.slug,
          content: ai.content || p.content,
          excerpt: ai.excerpt || p.excerpt,
          meta_title: ai.meta_title || p.meta_title,
          meta_description: ai.meta_description || p.meta_description,
          tags: ai.tags || p.tags,
          category: ai.category || p.category,
        }));
        toast({ title: "✨ Contenido generado con IA", description: "Revisa y edita antes de publicar." });
        setAiDialogOpen(false);
        if (!dialogOpen) setDialogOpen(true);
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
    if (!editing.title || !editing.content) {
      toast({ title: "Campos requeridos", description: "Título y contenido son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = editing.slug || slugify(editing.title);
    const payload = {
      title: editing.title!, slug, content: editing.content!,
      excerpt: editing.excerpt || null,
      category: editing.category || null,
      cover_image: editing.cover_image || null,
      author_name: editing.author_name || "Funeraria Santa Margarita",
      meta_title: editing.meta_title || null,
      meta_description: editing.meta_description || null,
      tags: editing.tags ?? [],
      published: editing.published ?? false,
      published_at: editing.published ? (editing.published_at || new Date().toISOString()) : null,
    };

    let error;
    if (editing.id) {
      ({ error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("blog_posts").insert(payload));
    }
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: editing.id ? "Artículo actualizado" : "Artículo creado" }); setDialogOpen(false); load(); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Artículo eliminado" }); load(); }
  };

  const field = (key: keyof BlogPost, label: string, opts?: { type?: string; full?: boolean; textarea?: boolean }) => (
    <div className={opts?.full ? "sm:col-span-2" : ""}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {opts?.textarea ? (
        <Textarea className="mt-1" rows={6} value={(editing[key] as string) ?? ""} onChange={e => setEditing(p => ({ ...p, [key]: e.target.value }))} />
      ) : (
        <Input className="mt-1" type={opts?.type ?? "text"} value={(editing[key] as string) ?? ""} onChange={e => setEditing(p => ({ ...p, [key]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Blog</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{posts.length} artículos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AIActionTooltip
            actionKey="blog.standardize_all"
            description="Recorre todos los artículos publicados y reformatea su HTML/Markdown con IA: limpia estructura, normaliza encabezados, listas y citas, y aplica el estilo editorial de Funeraria Santa Margarita sin modificar el contenido."
          >
            <Button variant="outline" size="sm" onClick={handleSanitizeAll} disabled={sanitizing}>
              <Wand2 className="w-4 h-4 mr-1" />
              {sanitizing ? "Saneando…" : "Estandarizar todos"}
            </Button>
          </AIActionTooltip>
          <AIActionTooltip
            actionKey="blog.generate_article"
            description="Abre el asistente de IA para generar un artículo completo (título, extracto, contenido y meta SEO) a partir de un tema y categoría que tú indiques."
          >
            <Button variant="outline" size="sm" onClick={() => { openCreate(); setAiDialogOpen(true); setAiTopic(""); }}>
              <Sparkles className="w-4 h-4 mr-1" />IA
            </Button>
          </AIActionTooltip>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Nuevo</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No hay artículos de blog.</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Crear primer artículo</Button>
        </div>
      ) : (
        <>
          <div className="rounded-md border hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map(post => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">{post.title}</TableCell>
                    <TableCell>
                      {post.category && <Badge variant="secondary">{post.category}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Switch checked={post.published} onCheckedChange={v => togglePublished(post.id, v)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString("es-CL")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(post)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-2" />Ver en web</a>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(post.id, post.title)}>
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
          <div className="space-y-2 md:hidden">
            {posts.map(post => (
              <div key={post.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-2">{post.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {post.category && <Badge variant="secondary" className="text-[10px]">{post.category}</Badge>}
                      <span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString("es-CL")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={post.published} onCheckedChange={v => togglePublished(post.id, v)} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(post)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-2" />Ver en web</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(post.id, post.title)}>
                          <Trash2 className="w-4 h-4 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Generar artículo con IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Tema del artículo</Label>
              <Textarea
                className="mt-1"
                rows={3}
                placeholder="Ej: Cómo planificar un funeral con anticipación en Chile"
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={editing.category ?? ""} onValueChange={v => setEditing(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {BLOG_CATEGORIES.map(c => (
                    <SelectItem key={c.key} value={c.label}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AIActionTooltip
              actionKey="blog.generate_article"
              description="Usa IA para crear un artículo completo (~800-1200 palabras) sobre el tema indicado, optimizado para SEO/AEO y con el tono empático y profesional de la funeraria."
            >
              <Button onClick={handleGenerateAI} disabled={generating} className="w-full">
                {generating ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Generando...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Generar contenido</>
                )}
              </Button>
            </AIActionTooltip>
            <p className="text-xs text-muted-foreground text-center">
              El contenido generado se cargará en el formulario para que puedas revisarlo y editarlo antes de publicar.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar Artículo" : "Nuevo Artículo"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {field("title", "Título *")}
            {field("slug", "Slug (URL)")}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Categoría</Label>
              <Select value={editing.category ?? ""} onValueChange={v => setEditing(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {BLOG_CATEGORIES.map(c => (
                    <SelectItem key={c.key} value={c.label}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field("author_name", "Autor")}
            {field("cover_image", "URL imagen de portada", { full: true })}
            {field("excerpt", "Extracto", { full: true, textarea: true })}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Contenido (HTML/Markdown) *</Label>
                <AIActionTooltip
                  actionKey="blog.generate_content_field"
                  description="Genera el cuerpo del artículo con IA a partir del título y categoría actuales. Reemplaza el campo Contenido — revísalo antes de publicar."
                >
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => { setAiDialogOpen(true); setAiTopic(""); }}
                    className="text-xs h-7"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />Generar con IA
                  </Button>
                </AIActionTooltip>
              </div>
              <Textarea className="mt-1" rows={6} value={(editing.content as string) ?? ""} onChange={e => setEditing(p => ({ ...p, content: e.target.value }))} />
            </div>
            {field("meta_title", "Meta título (SEO)")}
            {field("meta_description", "Meta descripción (SEO)")}
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">Tags (separados por coma)</Label>
              <Input className="mt-1" value={(editing.tags ?? []).join(", ")}
                onChange={e => setEditing(p => ({ ...p, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))} />
            </div>
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
