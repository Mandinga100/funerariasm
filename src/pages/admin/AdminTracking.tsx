import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableTable, type SortableColumn } from "@/components/admin/SortableTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus, Copy, MoreVertical, Eye, Pencil, Trash2, Link2, Phone, Mail,
  CheckCircle, Clock, MapPin, Users, FileText, CalendarDays, Activity,
  Search, AlertTriangle
} from "lucide-react";

/* ─── Constants ─── */
const STATUSES = ["recibido", "en_preparación", "velatorio", "ceremonia", "traslado", "finalizado"];

const STATUS_META: Record<string, { label: string; emoji: string; color: string; desc: string }> = {
  recibido: { label: "Recibido", emoji: "🔵", color: "bg-blue-100 text-blue-800 border-blue-300", desc: "El caso ha sido registrado en el sistema" },
  en_preparación: { label: "En Preparación", emoji: "🟡", color: "bg-yellow-100 text-yellow-800 border-yellow-300", desc: "Preparación del servicio funerario en curso" },
  velatorio: { label: "Velatorio", emoji: "🟣", color: "bg-purple-100 text-purple-800 border-purple-300", desc: "Velatorio en curso en la ubicación designada" },
  ceremonia: { label: "Ceremonia", emoji: "🔷", color: "bg-indigo-100 text-indigo-800 border-indigo-300", desc: "Ceremonia religiosa o civil en progreso" },
  traslado: { label: "Traslado", emoji: "🟠", color: "bg-orange-100 text-orange-800 border-orange-300", desc: "Traslado al cementerio o crematorio" },
  finalizado: { label: "Finalizado", emoji: "🟢", color: "bg-green-100 text-green-800 border-green-300", desc: "Servicio completado satisfactoriamente" },
};

// Orden intuitivo de seguimiento funerario: servicios activos primero,
// finalizados al final.
const TRACKING_STATUS_PRIORITY: Record<string, number> = {
  ceremonia: 1,
  velatorio: 2,
  traslado: 3,
  en_preparación: 4,
  recibido: 5,
  finalizado: 6,
};
const trackingStatusRank = (s: string) => TRACKING_STATUS_PRIORITY[s] ?? 99;

interface TrackingItem {
  id: string;
  family_code: string;
  family_name: string;
  family_email: string | null;
  family_phone: string | null;
  obituary_id: string | null;
  memorial_id: string | null;
  status: string;
  notes: string | null;
  assigned_at: string;
  updated_at: string;
}

export default function AdminTracking() {
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [detailSheet, setDetailSheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrackingItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({ family_name: "", family_email: "", family_phone: "", notes: "" });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("family_tracking").select("*").order("assigned_at", { ascending: false });
    setItems((data as TrackingItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchSearch = !searchQuery || i.family_name.toLowerCase().includes(searchQuery.toLowerCase()) || i.family_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === "all" || i.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [items, searchQuery, filterStatus]);

  const { sorted, sortHandled } = useSortedRows<TrackingItem>("admin_tracking", filtered, {
    status: (r) => trackingStatusRank(r.status),
    assigned_at: (r) => new Date(r.assigned_at).getTime(),
    updated_at: (r) => new Date(r.updated_at).getTime(),
  });
  const { page, pageSize, totalPages, from, to, setPage, setPageSize } = usePagination("tracking", sorted.length);
  const paginated = useMemo(() => sorted.slice(from, to + 1), [sorted, from, to]);
  useEffect(() => { setPage(1); }, [searchQuery, filterStatus, setPage]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("family_tracking").update({ status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { logAudit({ action: "update", module: "tracking", description: `Cambió estado a "${status}"`, entity_type: "family_tracking", entity_id: id, new_data: { status } }); load(); }
  };

  const createTracking = async () => {
    const { error } = await supabase.from("family_tracking").insert({
      family_name: form.family_name,
      family_email: form.family_email || null,
      family_phone: form.family_phone || null,
      notes: form.notes || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Seguimiento creado", description: "Se ha generado el código de tracking para la familia." });
      logAudit({ action: "create", module: "tracking", description: `Creó seguimiento para "${form.family_name}"`, entity_type: "family_tracking" });
      setForm({ family_name: "", family_email: "", family_phone: "", notes: "" });
      setDialogOpen(false);
      load();
    }
  };

  const updateTracking = async () => {
    if (!selectedItem) return;
    const { error } = await supabase.from("family_tracking").update({
      family_name: form.family_name,
      family_email: form.family_email || null,
      family_phone: form.family_phone || null,
      notes: form.notes || null,
    }).eq("id", selectedItem.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Actualizado", description: "Los datos del seguimiento han sido actualizados." });
      setEditDialog(false);
      setSelectedItem(null);
      load();
    }
  };

  const deleteTracking = async () => {
    if (!selectedItem) return;
    const { error } = await supabase.from("family_tracking").delete().eq("id", selectedItem.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Eliminado", description: "El seguimiento ha sido eliminado." });
      logAudit({ action: "delete", module: "tracking", description: `Eliminó seguimiento de "${selectedItem.family_name}"`, entity_type: "family_tracking", entity_id: selectedItem.id });
      setDeleteDialog(false);
      setSelectedItem(null);
      load();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/seguimiento?code=${code}`);
    toast({ title: "Enlace copiado", description: "El enlace de seguimiento se ha copiado al portapapeles." });
  };

  const openEdit = (item: TrackingItem) => {
    setSelectedItem(item);
    setForm({ family_name: item.family_name, family_email: item.family_email ?? "", family_phone: item.family_phone ?? "", notes: item.notes ?? "" });
    setEditDialog(true);
  };

  const openDetail = (item: TrackingItem) => {
    setSelectedItem(item);
    setDetailSheet(true);
  };

  const openDelete = (item: TrackingItem) => {
    setSelectedItem(item);
    setDeleteDialog(true);
  };

  /* ─── Stats ─── */
  const stats = useMemo(() => ({
    total: items.length,
    activos: items.filter(i => i.status !== "finalizado").length,
    finalizados: items.filter(i => i.status === "finalizado").length,
    hoy: items.filter(i => {
      const d = new Date(i.assigned_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  }), [items]);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Seguimiento Familiar</h1>
          <p className="text-sm text-muted-foreground">Gestión integral del proceso funerario para cada familia</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Nuevo Seguimiento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Seguimiento Familiar</DialogTitle>
              <DialogDescription>Registre un nuevo caso. Se generará un código único para la familia.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Nombre de la familia *</Label><Input value={form.family_name} onChange={e => setForm(p => ({ ...p, family_name: e.target.value }))} placeholder="Ej: Familia González" /></div>
              <div><Label>Email</Label><Input type="email" value={form.family_email} onChange={e => setForm(p => ({ ...p, family_email: e.target.value }))} placeholder="contacto@email.com" /></div>
              <div><Label>Teléfono</Label><Input value={form.family_phone} onChange={e => setForm(p => ({ ...p, family_phone: e.target.value }))} placeholder="+56 9 1234 5678" /></div>
              <div><Label>Notas iniciales</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones relevantes del caso..." rows={3} /></div>
              <Button onClick={createTracking} className="w-full" disabled={!form.family_name}>Crear Seguimiento</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Casos", value: stats.total, icon: FileText, color: "text-foreground" },
          { label: "Activos", value: stats.activos, icon: Activity, color: "text-amber-600" },
          { label: "Finalizados", value: stats.finalizados, icon: CheckCircle, color: "text-green-600" },
          { label: "Hoy", value: stats.hoy, icon: CalendarDays, color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label} className="border">
            <CardContent className="p-3 lg:p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
              <div>
                <p className="text-lg lg:text-xl font-bold leading-none">{s.value}</p>
                <p className="text-[11px] lg:text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por familia o código..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44 h-9"><SelectValue placeholder="Filtrar estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{STATUS_META[s]?.emoji} {STATUS_META[s]?.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No hay seguimientos</p>
          <p className="text-sm">{searchQuery || filterStatus !== "all" ? "Intenta ajustar los filtros" : "Crea uno nuevo para comenzar"}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <SortableTable<TrackingItem>
              tableKey="admin_tracking"
              rows={paginated}
              rowKey={(r) => r.id}
              onRowClick={(r) => openDetail(r)}
              columns={[
                {
                  key: "family_name",
                  label: "Familia",
                  defaultWidth: 220,
                  cell: (r) => <span className="font-medium">{r.family_name}</span>,
                },
                {
                  key: "family_code",
                  label: "Código",
                  defaultWidth: 130,
                  cell: (r) => (
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{r.family_code}</code>
                  ),
                },
                {
                  key: "status",
                  label: "Estado",
                  defaultWidth: 180,
                  cell: (r) => (
                    <Select value={r.status} onValueChange={v => updateStatus(r.id, v)}>
                      <SelectTrigger
                        className="w-[155px] h-8 text-xs"
                        onClick={e => e.stopPropagation()}
                        data-no-row-click
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>
                            <span className="flex items-center gap-1.5">
                              <span>{STATUS_META[s]?.emoji}</span>
                              <span>{STATUS_META[s]?.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ),
                },
                {
                  key: "contact",
                  label: "Contacto",
                  defaultWidth: 200,
                  sortable: false,
                  accessor: (r) => r.family_email ?? r.family_phone ?? "",
                  cell: (r) => (
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      {r.family_email && <div className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" />{r.family_email}</div>}
                      {r.family_phone && <div className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{r.family_phone}</div>}
                      {!r.family_email && !r.family_phone && <span className="text-xs">—</span>}
                    </div>
                  ),
                },
                {
                  key: "assigned_at",
                  label: "Registrado",
                  defaultWidth: 140,
                  cell: (r) => (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(r.assigned_at), "dd MMM yyyy", { locale: es })}
                    </span>
                  ),
                },
                {
                  key: "updated_at",
                  label: "Actualizado",
                  defaultWidth: 140,
                  cell: (r) => (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(r.updated_at), "dd MMM, HH:mm", { locale: es })}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "",
                  sortable: false,
                  resizable: false,
                  defaultWidth: 60,
                  cell: (r) => (
                    <div onClick={e => e.stopPropagation()} data-no-row-click>
                      <ActionsMenu item={r} onView={openDetail} onEdit={openEdit} onDelete={openDelete} onCopyLink={copyCode} />
                    </div>
                  ),
                } satisfies SortableColumn<TrackingItem>,
              ]}
            />
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {paginated.map(item => (
              <Card key={item.id} className="border" onClick={() => openDetail(item)}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{item.family_name}</p>
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{item.family_code}</code>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      <ActionsMenu item={item} onView={openDetail} onEdit={openEdit} onDelete={openDelete} onCopyLink={copyCode} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={`text-[10px] ${STATUS_META[item.status]?.color ?? "bg-muted"}`} variant="secondary">
                      {STATUS_META[item.status]?.emoji} {STATUS_META[item.status]?.label ?? item.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(item.assigned_at), "dd/MM/yy")}</span>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <Select value={item.status} onValueChange={v => updateStatus(item.id, v)}>
                      <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{STATUS_META[s]?.emoji} {STATUS_META[s]?.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(item.family_phone || item.family_email) && (
                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {item.family_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.family_phone}</span>}
                      {item.family_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{item.family_email}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalCount={filtered.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel={{ singular: "seguimiento", plural: "seguimientos" }}
          />
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Seguimiento</DialogTitle>
            <DialogDescription>Modifique los datos del caso familiar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre de la familia *</Label><Input value={form.family_name} onChange={e => setForm(p => ({ ...p, family_name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.family_email} onChange={e => setForm(p => ({ ...p, family_email: e.target.value }))} /></div>
            <div><Label>Teléfono</Label><Input value={form.family_phone} onChange={e => setForm(p => ({ ...p, family_phone: e.target.value }))} /></div>
            <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
            <Button onClick={updateTracking} className="w-full" disabled={!form.family_name}>Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Eliminar Seguimiento</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar el seguimiento de <strong>{selectedItem?.family_name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button variant="destructive" onClick={deleteTracking} className="w-full sm:w-auto">Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      {selectedItem && (
        <TrackingDetailSheet open={detailSheet} onOpenChange={setDetailSheet} item={selectedItem} onEdit={openEdit} onCopyLink={copyCode} />
      )}
    </div>
  );
}

/* ─── Actions dropdown ─── */
function ActionsMenu({ item, onView, onEdit, onDelete, onCopyLink }: {
  item: TrackingItem;
  onView: (i: TrackingItem) => void;
  onEdit: (i: TrackingItem) => void;
  onDelete: (i: TrackingItem) => void;
  onCopyLink: (code: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onView(item)}>
          <Eye className="w-4 h-4 mr-2" />Ver Detalle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(item)}>
          <Pencil className="w-4 h-4 mr-2" />Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCopyLink(item.family_code)}>
          <Link2 className="w-4 h-4 mr-2" />Copiar Enlace
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Professional Detail Sheet ─── */
function TrackingDetailSheet({ open, onOpenChange, item, onEdit, onCopyLink }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: TrackingItem;
  onEdit: (i: TrackingItem) => void;
  onCopyLink: (code: string) => void;
}) {
  const currentIdx = STATUSES.indexOf(item.status);
  const progress = ((currentIdx + 1) / STATUSES.length) * 100;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#C5A059]/10 to-transparent p-5 pb-4 border-b">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C5A059]" />
              {item.family_name}
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${STATUS_META[item.status]?.color ?? "bg-muted"}`} variant="secondary">
              {STATUS_META[item.status]?.emoji} {STATUS_META[item.status]?.label ?? item.status}
            </Badge>
            <code className="text-[11px] bg-background/80 border px-2 py-0.5 rounded font-mono">{item.family_code}</code>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onOpenChange(false); onEdit(item); }}>
              <Pencil className="w-3 h-3 mr-1" />Editar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onCopyLink(item.family_code)}>
              <Copy className="w-3 h-3 mr-1" />Copiar Enlace
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progreso del Servicio</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-[#C5A059] h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#C5A059]" />
              Línea de Tiempo del Servicio
            </h3>
            <div className="space-y-0">
              {STATUSES.map((step, idx) => {
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const isPending = idx > currentIdx;
                const meta = STATUS_META[step];
                return (
                  <div key={step} className="flex gap-3 relative">
                    {/* Vertical line */}
                    {idx < STATUSES.length - 1 && (
                      <div className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] ${isCompleted ? "bg-green-400" : isCurrent ? "bg-[#C5A059]/40" : "bg-muted"}`} />
                    )}
                    {/* Circle */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      isCompleted ? "bg-green-100 text-green-600 ring-2 ring-green-300" :
                      isCurrent ? "bg-[#C5A059]/20 text-[#C5A059] ring-2 ring-[#C5A059]" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    {/* Content */}
                    <div className={`pb-4 min-w-0 ${isPending ? "opacity-40" : ""}`}>
                      <p className={`text-sm ${isCurrent ? "font-bold" : isCompleted ? "font-medium" : ""}`}>
                        {meta?.label}
                        {isCurrent && <Badge className="ml-2 bg-[#C5A059]/15 text-[#C5A059] border-[#C5A059]/30 text-[9px]">Actual</Badge>}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{meta?.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#C5A059]" />
              Información de Contacto
            </h3>
            <div className="space-y-2">
              <InfoRow icon={<Users className="w-4 h-4" />} label="Familia" value={item.family_name} />
              <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={item.family_email} isLink={!!item.family_email} linkPrefix="mailto:" />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Teléfono" value={item.family_phone} isLink={!!item.family_phone} linkPrefix="tel:" />
              <InfoRow icon={<Link2 className="w-4 h-4" />} label="Código" value={item.family_code} mono />
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#C5A059]" />
              Fechas del Caso
            </h3>
            <div className="space-y-2">
              <InfoRow icon={<CalendarDays className="w-4 h-4" />} label="Registrado" value={format(new Date(item.assigned_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })} />
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Última Actualización" value={format(new Date(item.updated_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })} />
              <InfoRow icon={<Activity className="w-4 h-4" />} label="Tiempo Activo" value={(() => {
                const diff = Date.now() - new Date(item.assigned_at).getTime();
                const days = Math.floor(diff / 86400000);
                const hours = Math.floor((diff % 86400000) / 3600000);
                return days > 0 ? `${days} día${days > 1 ? "s" : ""}, ${hours}h` : `${hours} hora${hours !== 1 ? "s" : ""}`;
              })()} />
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C5A059]" />
                  Notas del Caso
                </h3>
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {item.notes}
                </div>
              </div>
            </>
          )}

          {/* IDs */}
          {(item.obituary_id || item.memorial_id) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C5A059]" />
                  Vínculos
                </h3>
                <div className="space-y-2">
                  {item.obituary_id && <InfoRow icon={<FileText className="w-4 h-4" />} label="Obituario" value="Vinculado" />}
                  {item.memorial_id && <InfoRow icon={<Flower2 className="w-4 h-4" />} label="Memorial" value="Vinculado" />}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Helpers ─── */
function InfoRow({ icon, label, value, mono, isLink, linkPrefix }: {
  icon: React.ReactNode; label: string; value: string | null; mono?: boolean; isLink?: boolean; linkPrefix?: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {value ? (
          isLink ? (
            <a href={`${linkPrefix}${value}`} className="font-medium text-[#C5A059] hover:underline break-all">{value}</a>
          ) : (
            <p className={`font-medium break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
          )
        ) : (
          <p className="text-muted-foreground text-xs">No registrado</p>
        )}
      </div>
    </div>
  );
}

/* tiny flower icon for memorial link */
function Flower2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9m3 4.5a4.5 4.5 0 1 0 4.5-4.5M12 16.5V15m4.5-3H15m-3 9V12" />
    </svg>
  );
}
