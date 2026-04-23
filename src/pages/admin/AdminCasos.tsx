import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SortableTable, type SortableColumn } from "@/components/admin/SortableTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Search, X, MoreVertical, Eye, Trash2, DollarSign, Clock, CheckCircle2, Briefcase, FileDown, AlertCircle, CalendarPlus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import CaseDetailSheet from "@/components/admin/cases/CaseDetailSheet";
import AgendaEventModal, { type AgendaPrefill } from "@/components/admin/agenda/AgendaEventModal";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import { usePersistentFilters } from "@/hooks/use-persistent-filters";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useAuth } from "@/hooks/useAuth";
import KpiCard from "@/components/admin/KpiCard";
import KpiDetailModal, { type KpiDetailColumn } from "@/components/admin/KpiDetailModal";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import SelectionCheckbox from "@/components/admin/SelectionCheckbox";
import { downloadCSV, downloadXLSX, todayStamp, kpiColumnsToExport, type ExportColumn } from "@/lib/admin-export";

interface ServiceCase {
  id: string;
  lead_id: string | null;
  case_number: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_rut: string | null;
  comuna: string | null;
  service_type: string | null;
  service_description: string | null;
  selected_plan: string | null;
  deceased_name: string | null;
  deceased_birth_date: string | null;
  deceased_death_date: string | null;
  ceremony_location: string | null;
  ceremony_date: string | null;
  assigned_to: string | null;
  pipeline_stage: string;
  payment_status: string;
  total_amount: number;
  notes: string | null;
  internal_notes: string | null;
  documents: string[] | null;
  source: string | null;
  intent: string | null;
  urgency: string | null;
  original_message: string | null;
  ai_classification: any;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

const PIPELINE_STAGES = [
  { id: "contactado", label: "Contactado", emoji: "🟡", color: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300" },
  { id: "cotizado", label: "Cotizado", emoji: "🟠", color: "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300" },
  { id: "contratado", label: "Contratado", emoji: "🟢", color: "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300" },
  { id: "cerrado", label: "Cerrado", emoji: "⚫", color: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200" },
];

const PAYMENT_STATUSES = [
  { id: "pendiente", label: "Pendiente", color: "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300" },
  { id: "cotizado", label: "Cotizado", color: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300" },
  { id: "aprobado", label: "Aprobado", color: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300" },
  { id: "pagado", label: "Pagado", color: "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300" },
  { id: "cancelado", label: "Cancelado", color: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300" },
];

const fmt = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

// Orden intuitivo siguiendo el flujo natural del proceso funerario.
// Asc = primer estado del flujo arriba; Desc = último estado arriba.
// Pago: Pendiente → Cotizado → Aprobado → Pagado → Cancelado.
const PAYMENT_PRIORITY: Record<string, number> = {
  pendiente: 1,
  cotizado: 2,
  aprobado: 3,
  pagado: 4,
  cancelado: 5,
};
// Etapa: Contactado → Cotizado → Contratado → Cerrado.
const PIPELINE_PRIORITY: Record<string, number> = {
  contactado: 1,
  cotizado: 2,
  contratado: 3,
  cerrado: 4,
};
const paymentRank = (s: string) => PAYMENT_PRIORITY[s] ?? 99;
const pipelineRank = (s: string) => PIPELINE_PRIORITY[s] ?? 99;

const STALE_MS = 48 * 60 * 60 * 1000;
const isStale = (c: ServiceCase) =>
  !["cerrado"].includes(c.pipeline_stage) && (Date.now() - new Date(c.updated_at).getTime()) > STALE_MS;

const staleHours = (c: ServiceCase) =>
  Math.round((Date.now() - new Date(c.updated_at).getTime()) / 3600000);

type CaseKpi = "active" | "pagados" | "totalRevenue" | "stale" | null;
const KPI_TITLES: Record<Exclude<CaseKpi, null>, { title: string; description: string }> = {
  active: { title: "Casos activos", description: "Casos en contactado, cotizado o contratado." },
  pagados: { title: "Casos pagados", description: "Casos con pago confirmado." },
  totalRevenue: { title: "Ingresos por casos", description: "Casos contratados con pago confirmado." },
  stale: { title: "Casos sin movimiento", description: "Más de 48 h sin actualización (no cerrados)." },
};

export default function AdminCasos() {
  const [cases, setCases] = useState<ServiceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ServiceCase | null>(null);
  const [activeKpi, setActiveKpi] = useState<CaseKpi>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [agendaPrefill, setAgendaPrefill] = useState<AgendaPrefill | null>(null);
  const { isCeo } = useAuth();
  const { filters, setFilter, hydrated: filtersHydrated } = usePersistentFilters("admin_casos", {
    filterPipeline: "all",
    filterPayment: "all",
    searchQuery: "",
  });
  const { filterPipeline, filterPayment, searchQuery } = filters;
  const { toast } = useToast();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("service_cases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setCases((data as ServiceCase[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`admin-cases-rt-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_cases" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const filtered = cases.filter(c => {
    if (filterPipeline !== "all" && c.pipeline_stage !== filterPipeline) return false;
    if (filterPayment !== "all" && c.payment_status !== filterPayment) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !(c.client_name?.toLowerCase().includes(q)) &&
        !(c.case_number.toLowerCase().includes(q)) &&
        !(c.deceased_name?.toLowerCase().includes(q)) &&
        !(c.client_phone?.toLowerCase().includes(q))
      ) return false;
    }
    return true;
  });

  const { sorted, sortHandled } = useSortedRows<ServiceCase>("admin_casos", filtered, {
    payment_status: (r) => paymentRank(r.payment_status),
    pipeline_stage: (r) => pipelineRank(r.pipeline_stage),
    total_amount: (r) => r.total_amount,
    created_at: (r) => new Date(r.created_at).getTime(),
  });
  const { page, pageSize, totalPages, from, to, setPage, setPageSize } = usePagination("casos", sorted.length);
  const paginatedRows = sorted.slice(from, to + 1);

  useEffect(() => { if (filtersHydrated) setPage(1); }, [filterPipeline, filterPayment, searchQuery, filtersHydrated, setPage]);

  const updateCase = async (id: string, updates: Partial<ServiceCase>) => {
    const { error } = await supabase.from("service_cases").update(updates as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    } else {
      toast({ title: "Caso actualizado" });
      // Also sync pipeline_stage back to lead
      const c = cases.find(c => c.id === id);
      if (c?.lead_id && updates.pipeline_stage) {
        await supabase.from("contact_leads").update({ pipeline_stage: updates.pipeline_stage } as any).eq("id", c.lead_id);
      }
      load();
    }
  };

  const deleteCase = async (id: string) => {
    if (!confirm("¿Eliminar este caso permanentemente?")) return;
    const c = cases.find(c => c.id === id);
    const { error } = await supabase.from("service_cases").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    } else {
      await logAudit({ action: "delete", module: "casos", description: `Caso ${c?.case_number} eliminado`, entity_type: "service_case", entity_id: id });
      toast({ title: "Caso eliminado" });
      load();
    }
  };

  const staleList = useMemo(() => cases.filter(isStale), [cases]);
  const stats = useMemo(() => ({
    total: cases.length,
    active: cases.filter(c => ["contactado", "cotizado", "contratado"].includes(c.pipeline_stage)).length,
    pagados: cases.filter(c => c.payment_status === "pagado").length,
    totalRevenue: cases.filter(c => c.payment_status === "pagado" && c.pipeline_stage === "contratado").reduce((sum, c) => sum + c.total_amount, 0),
    revenueRows: cases.filter(c => c.payment_status === "pagado" && c.pipeline_stage === "contratado"),
    activeRows: cases.filter(c => ["contactado", "cotizado", "contratado"].includes(c.pipeline_stage)),
    pagadosRows: cases.filter(c => c.payment_status === "pagado"),
    staleRows: staleList,
  }), [cases, staleList]);

  const selection = useRowSelection<ServiceCase>((r) => r.id);
  const headerState = selection.getSelectionStateFor(sorted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { selection.clear(); }, [filterPipeline, filterPayment, searchQuery]);

  const exportColumns: ExportColumn<ServiceCase>[] = [
    { key: "case_number", label: "Caso", accessor: (r) => r.case_number },
    { key: "client_name", label: "Cliente", accessor: (r) => r.client_name ?? "" },
    { key: "client_phone", label: "Teléfono", accessor: (r) => r.client_phone ?? "" },
    { key: "client_email", label: "Email", accessor: (r) => r.client_email ?? "" },
    { key: "comuna", label: "Comuna", accessor: (r) => r.comuna ?? "" },
    { key: "selected_plan", label: "Plan", accessor: (r) => r.selected_plan ?? "" },
    { key: "pipeline_stage", label: "Etapa", accessor: (r) => PIPELINE_STAGES.find(s => s.id === r.pipeline_stage)?.label ?? r.pipeline_stage },
    { key: "payment_status", label: "Pago", accessor: (r) => PAYMENT_STATUSES.find(s => s.id === r.payment_status)?.label ?? r.payment_status },
    { key: "total_amount", label: "Monto (CLP)", accessor: (r) => r.total_amount },
    { key: "created_at", label: "Creado", accessor: (r) => format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: es }) },
  ];

  const exportRows = (rows: ServiceCase[], fmtType: "csv" | "xlsx") => {
    const fname = `casos_${todayStamp()}`;
    if (fmtType === "csv") downloadCSV(rows, exportColumns, fname);
    else downloadXLSX(rows, exportColumns, fname, "Casos");
  };

  const handleBulkDelete = async () => {
    if (!isCeo) return;
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    setDeleting(true);
    const { error } = await supabase.from("service_cases").delete().in("id", ids);
    setDeleting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit({ action: "bulk_delete", module: "casos", description: `${ids.length} casos eliminados`, entity_type: "service_case" });
    toast({ title: `${ids.length} casos eliminados` });
    selection.clear();
    setConfirmDeleteOpen(false);
    load();
  };

  const getPipelineBadge = (stage: string) => {
    const s = PIPELINE_STAGES.find(p => p.id === stage);
    return s ? <Badge variant="secondary" className={cn("text-xs", s.color)}>{s.emoji} {s.label}</Badge> : <Badge variant="secondary">{stage}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const s = PAYMENT_STATUSES.find(p => p.id === status);
    return s ? <Badge variant="secondary" className={cn("text-xs", s.color)}>{s.label}</Badge> : <Badge variant="secondary">{status}</Badge>;
  };

  const kpiRows: ServiceCase[] = useMemo(() => {
    if (!activeKpi) return [];
    if (activeKpi === "active") return stats.activeRows;
    if (activeKpi === "pagados") return stats.pagadosRows;
    if (activeKpi === "totalRevenue") return stats.revenueRows;
    return stats.staleRows;
  }, [activeKpi, stats]);

  const kpiColumns: KpiDetailColumn<ServiceCase>[] = [
    { key: "case_number", label: "Caso", cell: (r) => <code className="text-xs font-mono">{r.case_number}</code>, exportAccessor: (r) => r.case_number },
    { key: "client", label: "Cliente", cell: (r) => (
      <div>
        <p className="font-medium text-sm">{r.client_name ?? "Sin nombre"}</p>
        {r.client_phone && <p className="text-xs text-muted-foreground">{r.client_phone}</p>}
      </div>
    ), exportAccessor: (r) => r.client_name ?? "" },
    { key: "plan", label: "Plan", cell: (r) => r.selected_plan ?? "—", exportAccessor: (r) => r.selected_plan ?? "" },
    { key: "stage", label: "Etapa", cell: (r) => getPipelineBadge(r.pipeline_stage), exportAccessor: (r) => r.pipeline_stage },
    { key: "payment", label: "Pago", cell: (r) => getPaymentBadge(r.payment_status), exportAccessor: (r) => r.payment_status },
    { key: "amount", label: "Monto", align: "right", cell: (r) => <span className="font-semibold tabular-nums">{r.total_amount > 0 ? fmt(r.total_amount) : "—"}</span>, exportAccessor: (r) => r.total_amount },
    { key: "created", label: "Fecha", cell: (r) => format(new Date(r.created_at), "dd/MM/yy", { locale: es }), exportAccessor: (r) => r.created_at },
  ];

  const kpiSummary = activeKpi === "totalRevenue"
    ? <p className="text-xs text-muted-foreground">Total: <span className="font-semibold text-foreground tabular-nums">{fmt(stats.totalRevenue)}</span></p>
    : activeKpi === "stale" && kpiRows.length > 0
      ? <p className="text-xs text-muted-foreground">Promedio sin movimiento: <span className="font-semibold text-foreground">{Math.round(kpiRows.reduce((a, c) => a + staleHours(c), 0) / kpiRows.length)} h</span></p>
      : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Casos y Servicios</h1>
        <Button variant="outline" size="sm" onClick={() => exportRows(filtered, "csv")} disabled={filtered.length === 0}>
          <FileDown className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Exportar visibles</span>
        </Button>
      </div>

      {/* KPIs interactivas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Total" value={stats.total} icon={Briefcase} iconClassName="bg-primary/10 text-primary" valueSize="md" />
        <KpiCard label="Activos" value={stats.active} icon={Clock} iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400" hint="Ver detalle" valueSize="md" onClick={() => setActiveKpi("active")} accentClassName="bg-amber-500/60" />
        <KpiCard label="Pagados" value={stats.pagados} icon={CheckCircle2} iconClassName="bg-green-500/10 text-green-600 dark:text-green-400" hint="Ver detalle" valueSize="md" onClick={() => setActiveKpi("pagados")} accentClassName="bg-green-500/60" />
        <KpiCard label="Ingresos" value={fmt(stats.totalRevenue)} icon={DollarSign} iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" hint="Casos contratados pagados" valueSize="md" onClick={() => setActiveKpi("totalRevenue")} accentClassName="bg-emerald-500/60" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, caso, difunto..." value={searchQuery} onChange={e => setFilter("searchQuery", e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 sm:w-40">
            <Select value={filterPipeline} onValueChange={(v) => setFilter("filterPipeline", v)}>
              <SelectTrigger><SelectValue placeholder="Etapa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.emoji} {s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 sm:w-40">
            <Select value={filterPayment} onValueChange={(v) => setFilter("filterPayment", v)}>
              <SelectTrigger><SelectValue placeholder="Pago" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {PAYMENT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {(filterPipeline !== "all" || filterPayment !== "all" || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilter("filterPipeline", "all"); setFilter("filterPayment", "all"); setFilter("searchQuery", ""); }}>
            <X className="w-4 h-4 mr-1" /> Limpiar
          </Button>
        )}
        <Badge variant="outline" className="self-center shrink-0">{filtered.length}/{cases.length}</Badge>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando casos...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No hay casos que coincidan. Los casos se crean automáticamente cuando un lead pasa a "Contactado".</p>
      ) : (
        <>
          <BulkActionsBar
            count={selection.count}
            totalLabel="casos seleccionados"
            onClear={selection.clear}
            onExportCSV={() => exportRows(selection.getSelectedRows(cases), "csv")}
            onExportXLSX={() => exportRows(selection.getSelectedRows(cases), "xlsx")}
            onDelete={() => setConfirmDeleteOpen(true)}
            canDelete={isCeo}
            helperText={!isCeo ? "Solo CEO puede eliminar" : undefined}
          />
          {/* Desktop table */}
          <div className="hidden md:block">
            <SortableTable<ServiceCase>
              tableKey="admin_casos"
              rows={paginatedRows}
              rowKey={(r) => r.id}
              onRowClick={(r) => setSelected(r)}
              externalSort={sortHandled}
              selection={{
                isSelected: selection.isSelected,
                toggle: selection.toggle,
                headerState,
                toggleAll: () => selection.toggleAll(sorted),
              }}
              columns={[
                {
                  key: "case_number",
                  label: "Caso",
                  defaultWidth: 160,
                  cell: (r) => {
                    const stale = isStale(r);
                    return (
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        {stale && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        {r.case_number}
                      </div>
                    );
                  },
                },
                {
                  key: "client_name",
                  label: "Cliente",
                  defaultWidth: 200,
                  cell: (r) => (
                    <div>
                      <p className="font-medium text-sm">{r.client_name ?? "Sin nombre"}</p>
                      {r.client_phone && <p className="text-xs text-muted-foreground">{r.client_phone}</p>}
                    </div>
                  ),
                },
                {
                  key: "selected_plan",
                  label: "Plan",
                  defaultWidth: 140,
                  cell: (r) => <Badge variant="secondary" className="text-xs">{r.selected_plan ?? "—"}</Badge>,
                },
                {
                  key: "pipeline_stage",
                  label: "Etapa",
                  defaultWidth: 140,
                  accessor: (r) => pipelineRank(r.pipeline_stage),
                  cell: (r) => getPipelineBadge(r.pipeline_stage),
                },
                {
                  key: "payment_status",
                  label: "Pago",
                  defaultWidth: 130,
                  accessor: (r) => paymentRank(r.payment_status),
                  cell: (r) => getPaymentBadge(r.payment_status),
                },
                {
                  key: "total_amount",
                  label: "Monto",
                  defaultWidth: 130,
                  cell: (r) => <span className="font-semibold">{r.total_amount > 0 ? fmt(r.total_amount) : "—"}</span>,
                },
                {
                  key: "created_at",
                  label: "Fecha",
                  defaultWidth: 140,
                  cell: (r) => {
                    const stale = isStale(r);
                    return (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">{format(new Date(r.created_at), "dd/MM/yy", { locale: es })}</span>
                        {stale && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{staleHours(r)}h</Badge>}
                      </div>
                    );
                  },
                },
                {
                  key: "actions",
                  label: "Acciones",
                  sortable: false,
                  resizable: false,
                  defaultWidth: 90,
                  align: "right",
                  cellClassName: "text-right",
                  cell: (c) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(c)}><Eye className="w-4 h-4 mr-2" />Ver detalle</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {PIPELINE_STAGES.filter(s => s.id !== c.pipeline_stage).map(s => (
                          <DropdownMenuItem key={s.id} onClick={() => updateCase(c.id, { pipeline_stage: s.id } as any)}>
                            {s.emoji} Mover a {s.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        {PAYMENT_STATUSES.filter(s => s.id !== c.payment_status).map(s => (
                          <DropdownMenuItem key={s.id} onClick={() => updateCase(c.id, { payment_status: s.id } as any)}>
                            💰 Pago: {s.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteCase(c.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                } satisfies SortableColumn<ServiceCase>,
              ]}
            />
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paginatedRows.map(c => {
              const stale = isStale(c);
              return (
              <div key={c.id} className={cn("border rounded-lg p-3 space-y-2 cursor-pointer active:bg-muted/30", stale && "border-red-400 dark:border-red-800 bg-red-50 dark:bg-red-950/40", selection.isSelected(c.id) && "ring-2 ring-primary/40 border-primary/40")} onClick={() => setSelected(c)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <SelectionCheckbox state={selection.isSelected(c.id)} onChange={() => selection.toggle(c.id)} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {stale && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        <p className="text-sm font-medium truncate">{c.client_name ?? "Sin nombre"}</p>
                      </div>
                      <code className="text-[10px] text-muted-foreground font-mono">{c.case_number}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {c.total_amount > 0 && <span className="text-sm font-bold">{fmt(c.total_amount)}</span>}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(c)}><Eye className="w-4 h-4 mr-2" />Ver detalle</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {PIPELINE_STAGES.filter(s => s.id !== c.pipeline_stage).map(s => (
                          <DropdownMenuItem key={s.id} onClick={() => updateCase(c.id, { pipeline_stage: s.id } as any)}>
                            {s.emoji} {s.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        {PAYMENT_STATUSES.filter(s => s.id !== c.payment_status).map(s => (
                          <DropdownMenuItem key={s.id} onClick={() => updateCase(c.id, { payment_status: s.id } as any)}>
                            💰 {s.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteCase(c.id)}><Trash2 className="w-4 h-4 mr-2" />Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getPipelineBadge(c.pipeline_stage)}
                  {getPaymentBadge(c.payment_status)}
                  {c.selected_plan && <Badge variant="outline" className="text-[10px]">{c.selected_plan}</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                  {stale && <span className="text-red-500 font-semibold ml-1">⚠ {staleHours(c)}h sin cambios</span>}
                </p>
              </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalCount={filtered.length}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel={{ singular: "caso", plural: "casos" }}
      />

      {/* Detail sheet */}
      <CaseDetailSheet
        serviceCase={selected}
        onClose={() => setSelected(null)}
        onUpdate={load}
      />

      {/* KPI detail modal */}
      <KpiDetailModal<ServiceCase>
        open={!!activeKpi}
        onClose={() => setActiveKpi(null)}
        title={activeKpi ? KPI_TITLES[activeKpi].title : ""}
        description={activeKpi ? KPI_TITLES[activeKpi].description : ""}
        rows={kpiRows}
        rowKey={(r) => r.id}
        columns={kpiColumns}
        summary={kpiSummary}
        onRowClick={(r) => { setSelected(r); setActiveKpi(null); }}
        onExportCSV={() => {
          if (!activeKpi) return;
          const cols = kpiColumnsToExport(kpiColumns);
          downloadCSV(kpiRows, cols, `casos_${activeKpi}_${todayStamp()}`);
        }}
        onExportXLSX={() => {
          if (!activeKpi) return;
          const cols = kpiColumnsToExport(kpiColumns);
          downloadXLSX(kpiRows, cols, `casos_${activeKpi}_${todayStamp()}`, "Casos");
        }}
        emptyMessage="No hay casos en esta categoría."
        totalLabel="casos"
      />

      {/* Bulk delete confirm */}
      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selection.count}
        itemLabel={{ singular: "caso", plural: "casos" }}
        loading={deleting}
      />
    </div>
  );
}
