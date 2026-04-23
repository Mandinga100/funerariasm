import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Phone, Clock, Eye, LayoutGrid, List, Sparkles, ChevronDown, ChevronUp, Inbox, Flame, CheckCircle2, AlarmClock } from "lucide-react";
import { differenceInHours, format } from "date-fns";
import { es } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import LeadDetailSheet from "@/components/admin/crm/LeadDetailSheet";
import { AIActionTooltip } from "@/components/admin/AIActionTooltip";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { usePagination } from "@/hooks/use-pagination";
import { usePersistentFilters } from "@/hooks/use-persistent-filters";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useAuth } from "@/hooks/useAuth";
import KpiCard from "@/components/admin/KpiCard";
import KpiDetailModal, { type KpiDetailColumn } from "@/components/admin/KpiDetailModal";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import SelectionCheckbox from "@/components/admin/SelectionCheckbox";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import { downloadCSV, downloadXLSX, todayStamp, kpiColumnsToExport, type ExportColumn } from "@/lib/admin-export";
import {
  PIPELINE_STAGES,
  URGENCY_LABELS,
  getUrgencyClasses,
  getPriorityClasses,
  getLeadCategory,
  LEAD_CATEGORY_META,
  type LeadCategory,
} from "@/lib/crm-tokens";

type KpiKey = "total" | "urgent" | "overdue" | "closed";

const LEAD_EXPORT_COLUMNS: ExportColumn<Lead>[] = [
  { key: "name", label: "Nombre", accessor: (l) => l.name ?? "" },
  { key: "email", label: "Email", accessor: (l) => l.email ?? "" },
  { key: "phone", label: "Teléfono", accessor: (l) => l.phone ?? "" },
  { key: "comuna", label: "Comuna", accessor: (l) => l.comuna ?? "" },
  { key: "urgency", label: "Urgencia", accessor: (l) => l.urgency ?? "" },
  { key: "stage", label: "Etapa", accessor: (l) => l.pipeline_stage ?? "" },
  { key: "plan", label: "Plan", accessor: (l) => l.selected_plan ?? "" },
  { key: "value", label: "Valor estimado", accessor: (l) => l.estimated_value ?? 0 },
  { key: "source", label: "Fuente", accessor: (l) => l.source ?? "" },
  { key: "created", label: "Creado", accessor: (l) => l.created_at },
];

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  contact_type: string;
  intent: string | null;
  source: string | null;
  urgency: string | null;
  status: string | null;
  pipeline_stage: string;
  estimated_value: number | null;
  next_follow_up: string | null;
  ai_summary: string | null;
  ai_classification: any | null;
  last_contacted_at: string | null;
  created_at: string;
  message: string | null;
  comuna: string | null;
  selected_plan: string | null;
}

function getPriorityScore(lead: Lead): number | null {
  return lead.ai_classification?.priority_score ?? null;
}

function PriorityBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  return (
    <span className={cn("text-[8px] lg:text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums leading-none", getPriorityClasses(score))}>
      {score}
    </span>
  );
}

export default function AdminLeads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { filters, setFilter, hydrated: filtersHydrated } = usePersistentFilters("admin_leads", {
    viewMode: "kanban" as "kanban" | "list",
    filterUrgency: searchParams.get("urgency") ?? "all",
    filterStage: searchParams.get("stage") ?? "all",
    filterOverdue: searchParams.get("filter") === "overdue",
    categoryTab: (searchParams.get("category") ?? "all") as "all" | LeadCategory,
  });
  const { viewMode, filterUrgency, filterStage, filterOverdue, categoryTab } = filters;
  const setViewMode = (v: "kanban" | "list") => setFilter("viewMode", v);
  const setFilterUrgency = (v: string) => setFilter("filterUrgency", v);
  const setFilterStage = (v: string) => setFilter("filterStage", v);
  const setFilterOverdue = (v: boolean) => setFilter("filterOverdue", v);
  const setCategoryTab = (v: "all" | LeadCategory) => setFilter("categoryTab", v);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [classifyingAll, setClassifyingAll] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({ nuevo: true, contactado: true });
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { isCeo } = useAuth();
  const selection = useRowSelection<Lead>((l) => l.id);
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const urgent = leads.filter((l) => l.urgency === "inmediata" || l.urgency === "immediate");
    const overdue = leads.filter((l) => {
      if ((l.pipeline_stage ?? "nuevo") !== "nuevo") return false;
      const hours = differenceInHours(now, new Date(l.created_at));
      if (l.urgency === "inmediata" || l.urgency === "immediate") return hours >= 2;
      if (l.urgency === "normal") return hours >= 24;
      return hours >= 72;
    });
    const closed = leads.filter((l) => (l.pipeline_stage ?? "") === "cerrado" || l.status === "closed");
    return { total: leads.length, urgent, overdue, closed };
  }, [leads]);

  const kpiRows = useMemo(() => {
    if (activeKpi === "total") return leads;
    if (activeKpi === "urgent") return stats.urgent;
    if (activeKpi === "overdue") return stats.overdue;
    if (activeKpi === "closed") return stats.closed;
    return [] as Lead[];
  }, [activeKpi, leads, stats]);

  const kpiMeta: Record<KpiKey, { title: string; description: string }> = {
    total: { title: "Todos los leads", description: "Listado completo de contactos recibidos." },
    urgent: { title: "Leads urgentes", description: "Contactos marcados como urgencia inmediata." },
    overdue: { title: "Leads vencidos sin contactar", description: "Leads en etapa 'Nuevo' que superaron su SLA." },
    closed: { title: "Leads cerrados", description: "Contactos cuyo proceso ya finalizó." },
  };

  const kpiColumns: KpiDetailColumn<Lead>[] = useMemo(() => [
    { key: "name", label: "Nombre", cell: (l) => <span className="font-medium">{l.name ?? "—"}</span>, exportAccessor: (l) => l.name ?? "" },
    { key: "phone", label: "Teléfono", cell: (l) => <span className="tabular-nums">{l.phone ?? "—"}</span>, exportAccessor: (l) => l.phone ?? "" },
    {
      key: "urgency",
      label: "Urgencia",
      cell: (l) => l.urgency ? (
        <Badge variant="secondary" className={cn("text-[10px]", getUrgencyClasses(l.urgency))}>
          {URGENCY_LABELS[l.urgency] ?? l.urgency}
        </Badge>
      ) : <span className="text-muted-foreground">—</span>,
      exportAccessor: (l) => l.urgency ?? "",
    },
    { key: "stage", label: "Etapa", cell: (l) => l.pipeline_stage ?? "nuevo", exportAccessor: (l) => l.pipeline_stage ?? "nuevo" },
    {
      key: "created",
      label: "Recibido",
      cell: (l) => <span className="text-xs text-muted-foreground">{format(new Date(l.created_at), "dd/MM HH:mm", { locale: es })}</span>,
      exportAccessor: (l) => l.created_at,
      align: "right",
    },
  ], []);

  const exportRows = (rows: Lead[], fmt: "csv" | "xlsx") => {
    const fname = `leads-${todayStamp()}`;
    if (fmt === "csv") downloadCSV(rows, LEAD_EXPORT_COLUMNS, fname);
    else downloadXLSX(rows, LEAD_EXPORT_COLUMNS, fname, "Leads");
  };

  const exportKpi = (fmt: "csv" | "xlsx") => {
    const cols = kpiColumnsToExport(kpiColumns);
    const fname = `leads_${activeKpi ?? "kpi"}_${todayStamp()}`;
    if (fmt === "csv") downloadCSV(kpiRows, cols, fname);
    else downloadXLSX(kpiRows, cols, fname, "Leads");
  };

  const handleBulkDelete = async () => {
    if (!isCeo) return;
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    setDeleting(true);
    const { error } = await supabase.from("contact_leads").delete().in("id", ids);
    setDeleting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    logAudit({
      action: "delete",
      module: "leads",
      description: `Eliminó ${ids.length} lead(s) en bloque`,
      entity_type: "contact_lead",
      new_data: { ids },
    });
    toast({ title: "Eliminados", description: `${ids.length} lead(s) eliminados` });
    selection.clear();
    setConfirmDeleteOpen(false);
    loadLeads();
  };

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && leads.length > 0) {
      const found = leads.find(l => l.id === openId);
      if (found) {
        setSelectedLead(found);
        const next = new URLSearchParams(searchParams);
        next.delete("open");
        setSearchParams(next, { replace: true });
      }
    }
  }, [leads, searchParams]);

  useEffect(() => {
    loadLeads();
    const channel = supabase
      .channel(`crm-leads-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_leads" }, () => loadLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadLeads = async () => {
    const { data } = await supabase
      .from("contact_leads")
      .select("id, name, email, phone, contact_type, intent, source, urgency, status, pipeline_stage, estimated_value, next_follow_up, ai_summary, ai_classification, last_contacted_at, created_at, message, comuna, selected_plan")
      .order("created_at", { ascending: false })
      .limit(500);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  };

  // Conteo por categoría comercial — alimenta los badges de las pestañas.
  const categoryCounts = useMemo(() => {
    const counts: Record<LeadCategory, number> = { urgencia: 0, cotizacion: 0, prevision: 0 };
    leads.forEach((l) => { counts[getLeadCategory(l.urgency)] += 1; });
    return counts;
  }, [leads]);

  // For kanban mode, ignore filterStage so cards don't disappear when dragged
  const filtered = useMemo(() => {
    const now = new Date();
    const isKanban = viewMode === "kanban" && !isMobile;
    return leads.filter(l => {
      // Filtro por pestaña de categoría comercial (Urgencias / Cotizaciones / Previsión).
      if (categoryTab !== "all" && getLeadCategory(l.urgency) !== categoryTab) return false;
      if (filterUrgency !== "all") {
        const normalizedUrgency = l.urgency === "immediate" ? "inmediata" : l.urgency;
        if (normalizedUrgency !== filterUrgency) return false;
      }
      // In kanban mode, don't filter by stage — all stages are visible as columns
      if (!isKanban && filterStage !== "all" && (l.pipeline_stage || "nuevo") !== filterStage) return false;
      if (filterOverdue) {
        if ((l.pipeline_stage ?? "nuevo") !== "nuevo") return false;
        const hours = differenceInHours(now, new Date(l.created_at));
        if ((l.urgency === "inmediata" || l.urgency === "immediate") && hours < 2) return false;
        if (l.urgency === "normal" && hours < 24) return false;
        if (l.urgency !== "inmediata" && l.urgency !== "immediate" && l.urgency !== "normal" && hours < 72) return false;
      }
      return true;
    });
  }, [leads, filterUrgency, filterStage, filterOverdue, viewMode, isMobile, categoryTab]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    PIPELINE_STAGES.forEach(s => { map[s.id] = []; });
    filtered.forEach(l => {
      const stage = l.pipeline_stage || "nuevo";
      if (!map[stage]) map[stage] = [];
      map[stage].push(l);
    });
    return map;
  }, [filtered]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStage = result.destination.droppableId;

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_stage: newStage } : l));

    const updates: { pipeline_stage: string; last_contacted_at?: string; status?: string } = { pipeline_stage: newStage };
    if (["contactado", "cotizado", "contratado"].includes(newStage)) {
      updates.last_contacted_at = new Date().toISOString();
    }
    if (newStage !== "nuevo" && newStage !== "cerrado") {
      updates.status = "contacted";
    } else if (newStage === "cerrado") {
      updates.status = "closed";
    }

    const { error } = await supabase.from("contact_leads").update(updates).eq("id", leadId);
    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
      loadLeads();
    } else {
      logAudit({ action: "update", module: "leads", description: `Movió lead a etapa "${newStage}"`, entity_type: "contact_lead", entity_id: leadId, new_data: updates });
    }
  };

  const handleStageChange = async (id: string, stage: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, pipeline_stage: stage } : l));
    await supabase.from("contact_leads").update({ pipeline_stage: stage }).eq("id", id);
    logAudit({ action: "update", module: "leads", description: `Cambió etapa de lead a "${stage}"`, entity_type: "contact_lead", entity_id: id, new_data: { pipeline_stage: stage } });
    loadLeads();
  };

  const handleClassifyAll = async () => {
    setClassifyingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-lead", {
        body: { mode: "batch" },
      });

      if (error) throw error;

      const result = data as { classified: number; priority_order: string[] };

      // Re-sort leads by AI priority order
      if (result.priority_order?.length) {
        setLeads(prev => {
          const orderMap = new Map(result.priority_order.map((id: string, idx: number) => [id, idx]));
          return [...prev].sort((a, b) => {
            const aIdx = orderMap.get(a.id) ?? 999;
            const bIdx = orderMap.get(b.id) ?? 999;
            return aIdx - bIdx;
          });
        });
      }

      toast({
        title: "✅ Clasificación IA completada",
        description: `${result.classified} leads clasificados y priorizados por urgencia funeraria`,
      });

      // Reload to get updated AI data
      await loadLeads();
    } catch (e: any) {
      const msg = e?.message?.includes("429")
        ? "Límite de solicitudes excedido. Intenta en unos minutos."
        : e?.message?.includes("402")
        ? "Créditos de IA agotados. Contacta al administrador."
        : "Error en clasificación IA";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setClassifyingAll(false);
  };

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const hasActiveFilters = filterStage !== "all" || filterOverdue || filterUrgency !== "all";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Leads</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} contactos
            {hasActiveFilters && (
              <button
                className="ml-2 text-primary hover:underline"
                onClick={() => { setFilterStage("all"); setFilterOverdue(false); setFilterUrgency("all"); }}
              >
                Limpiar filtros
              </button>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <AIActionTooltip
            actionKey="crm.classify_all_leads"
            description="Procesa con IA todos los leads sin análisis: detecta intención, urgencia, plan estimado, valor potencial y siguiente acción recomendada. Útil tras importar muchos leads."
          >
            <Button size="sm" variant="outline" className={cn("h-8 text-xs", classifyingAll && "animate-pulse")} onClick={handleClassifyAll} disabled={classifyingAll}>
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">{classifyingAll ? "Clasificando..." : "Clasificar con IA"}</span>
              <span className="sm:hidden">IA</span>
            </Button>
          </AIActionTooltip>
          {filterOverdue && (
            <Badge variant="destructive" className="h-7 text-xs cursor-pointer" onClick={() => setFilterOverdue(false)}>
              ⚠️ Vencidos ✕
            </Badge>
          )}
          <Select value={filterUrgency} onValueChange={setFilterUrgency}>
            <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs">
              <SelectValue placeholder="Urgencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="inmediata">🔴 Urgente</SelectItem>
              <SelectItem value="normal">🔵 Normal</SelectItem>
              <SelectItem value="previsión">🟢 Previsión</SelectItem>
            </SelectContent>
          </Select>
          {!isMobile && (
            <div className="flex border rounded-md">
              <Button size="sm" variant={viewMode === "kanban" ? "default" : "ghost"} className="h-8 px-2" onClick={() => setViewMode("kanban")}>
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button size="sm" variant={viewMode === "list" ? "default" : "ghost"} className="h-8 px-2" onClick={() => setViewMode("list")}>
                <List className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs interactivos (oculto en kanban desktop para no recargar UI) */}
      {(isMobile || viewMode === "list") && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <KpiCard
            label="Total leads"
            value={stats.total}
            icon={Inbox}
            onClick={stats.total > 0 ? () => setActiveKpi("total") : undefined}
            hint={stats.total > 0 ? "Ver todos" : undefined}
          />
          <KpiCard
            label="Urgentes"
            value={stats.urgent.length}
            icon={Flame}
            iconClassName="text-destructive"
            accentClassName="border-destructive/40"
            onClick={stats.urgent.length > 0 ? () => setActiveKpi("urgent") : undefined}
            hint={stats.urgent.length > 0 ? "Ver detalles" : undefined}
          />
          <KpiCard
            label="Vencidos"
            value={stats.overdue.length}
            icon={AlarmClock}
            iconClassName="text-amber-500"
            accentClassName="border-amber-500/40"
            onClick={stats.overdue.length > 0 ? () => setActiveKpi("overdue") : undefined}
            hint={stats.overdue.length > 0 ? "Ver detalles" : undefined}
          />
          <KpiCard
            label="Cerrados"
            value={stats.closed.length}
            icon={CheckCircle2}
            iconClassName="text-emerald-500"
            accentClassName="border-emerald-500/40"
            onClick={stats.closed.length > 0 ? () => setActiveKpi("closed") : undefined}
            hint={stats.closed.length > 0 ? "Ver detalles" : undefined}
          />
        </div>
      )}

      {/* Bulk actions bar */}
      {viewMode === "list" && !isMobile && (
        <BulkActionsBar
          count={selection.count}
          onClear={selection.clear}
          onExportCSV={() => exportRows(selection.getSelectedRows(filtered), "csv")}
          onExportXLSX={() => exportRows(selection.getSelectedRows(filtered), "xlsx")}
          onDelete={isCeo ? () => setConfirmDeleteOpen(true) : undefined}
          canDelete={isCeo}
          helperText={!isCeo ? "Solo CEO puede eliminar" : undefined}
        />
      )}


      {isMobile ? (
        <MobileStagesView
          leadsByStage={leadsByStage}
          expandedStages={expandedStages}
          onToggle={toggleStage}
          onSelect={setSelectedLead}
          onStageChange={handleStageChange}
        />
      ) : viewMode === "kanban" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* En pantallas <xl mostramos scroll horizontal para que las 5 columnas no se compriman.
              A partir de xl usamos el grid completo. */}
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <div
              className="grid grid-flow-col xl:grid-flow-row auto-cols-[minmax(220px,1fr)] xl:auto-cols-auto xl:grid-cols-5 gap-2 lg:gap-3"
              style={{ minHeight: "calc(100vh - 240px)" }}
            >
              {PIPELINE_STAGES.map(stage => (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex flex-col rounded-lg border-2 p-1.5 lg:p-2 transition-colors min-w-0",
                        stage.color,
                        snapshot.isDraggingOver && "ring-2 ring-ring"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 px-1 min-w-0">
                        <span className="text-xs lg:text-sm font-semibold truncate flex-1 min-w-0">
                          <span className="mr-1">{stage.emoji}</span>{stage.label}
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-5 flex-shrink-0 tabular-nums">
                          {leadsByStage[stage.id]?.length ?? 0}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 min-h-[80px] flex-1">
                        {(leadsByStage[stage.id] ?? []).map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "bg-card text-card-foreground rounded-md border border-border p-2 lg:p-3 shadow-sm cursor-grab hover:shadow-md transition-shadow min-w-0",
                                  snapshot.isDragging && "shadow-lg ring-2 ring-ring rotate-2"
                                )}
                                onClick={() => setSelectedLead(lead)}
                              >
                                <LeadCard lead={lead} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </div>
        </DragDropContext>
      ) : (
        <LeadListView
          leads={filtered}
          onSelect={setSelectedLead}
          onStageChange={handleStageChange}
          selection={selection}
        />
      )}

      <LeadDetailSheet lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={loadLeads} />

      {activeKpi && (
        <KpiDetailModal<Lead>
          open={!!activeKpi}
          onClose={() => setActiveKpi(null)}
          title={kpiMeta[activeKpi].title}
          description={kpiMeta[activeKpi].description}
          rows={kpiRows}
          rowKey={(l) => l.id}
          columns={kpiColumns}
          onRowClick={(l) => { setSelectedLead(l); setActiveKpi(null); }}
          onExportCSV={() => exportKpi("csv")}
          onExportXLSX={() => exportKpi("xlsx")}
          totalLabel="leads"
        />
      )}

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selection.count}
        itemLabel={{ singular: "lead", plural: "leads" }}
        loading={deleting}
      />
    </div>
  );
}

/* ─── Mobile stacked accordion view ─── */
function MobileStagesView({
  leadsByStage,
  expandedStages,
  onToggle,
  onSelect,
  onStageChange,
}: {
  leadsByStage: Record<string, Lead[]>;
  expandedStages: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (lead: Lead) => void;
  onStageChange: (id: string, stage: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {PIPELINE_STAGES.map(stage => {
        const stageLeads = leadsByStage[stage.id] ?? [];
        const isExpanded = expandedStages[stage.id] ?? false;
        return (
          <div key={stage.id} className={cn("rounded-lg border overflow-hidden", stage.color)}>
            <button
              onClick={() => onToggle(stage.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left"
            >
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", stage.dotColor)} />
                <span className="text-sm font-semibold">{stage.label}</span>
                <Badge variant="secondary" className="text-[10px] h-5">{stageLeads.length}</Badge>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {isExpanded && stageLeads.length > 0 && (
              <div className="px-2 pb-2 space-y-1.5">
                {stageLeads.map(lead => (
                  <MobileLeadCard
                    key={lead.id}
                    lead={lead}
                    onSelect={onSelect}
                    onStageChange={onStageChange}
                  />
                ))}
              </div>
            )}
            {isExpanded && stageLeads.length === 0 && (
              <p className="px-3 pb-2 text-xs text-muted-foreground">Sin leads en esta etapa</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Mobile lead card ─── */
function MobileLeadCard({ lead, onSelect, onStageChange }: { lead: Lead; onSelect: (l: Lead) => void; onStageChange: (id: string, stage: string) => void }) {
  const hours = differenceInHours(new Date(), new Date(lead.created_at));

  return (
    <div
      className="bg-card text-card-foreground rounded-lg border border-border p-2.5 shadow-sm active:shadow-md transition-shadow"
      onClick={() => onSelect(lead)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <PriorityBadge score={getPriorityScore(lead)} />
          <p className="font-medium text-sm leading-tight truncate">{lead.name ?? "Sin nombre"}</p>
        </div>
        {lead.urgency && (
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium border whitespace-nowrap", getUrgencyClasses(lead.urgency))}>
            {URGENCY_LABELS[lead.urgency] ?? lead.urgency}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
        {lead.phone && (
          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
        )}
        <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{hours}h</span>
      </div>

      {lead.ai_summary && (
        <p className="text-[10px] text-muted-foreground bg-accent/10 border border-accent/20 rounded px-2 py-1 line-clamp-2 mb-1.5">
          🤖 {lead.ai_summary}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Select
          value={lead.pipeline_stage || "nuevo"}
          onValueChange={(v) => { onStageChange(lead.id, v); }}
        >
          <SelectTrigger
            className="h-7 text-[10px] w-[110px]"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.emoji} {s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {lead.estimated_value ? (
          <span className="text-xs font-semibold text-accent">${lead.estimated_value.toLocaleString("es-CL")}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{lead.source ?? ""}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Desktop lead card (kanban) ─── */
function LeadCard({ lead }: { lead: Lead }) {
  const hours = differenceInHours(new Date(), new Date(lead.created_at));
  const isOverdue = lead.urgency === "inmediata" || lead.urgency === "immediate" ? hours >= 2 : lead.urgency === "normal" ? hours >= 24 : hours >= 72;
  const score = getPriorityScore(lead);

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <PriorityBadge score={score} />
          <p className="font-medium text-xs lg:text-sm leading-tight truncate">{lead.name ?? "Sin nombre"}</p>
        </div>
        {lead.urgency && (
          <span className={cn("text-[8px] lg:text-[9px] px-1 py-0.5 rounded-full font-medium border whitespace-nowrap flex-shrink-0", getUrgencyClasses(lead.urgency))}>
            {URGENCY_LABELS[lead.urgency] ?? lead.urgency}
          </span>
        )}
      </div>
      {lead.phone && (
        <div className="flex items-center gap-1 text-[10px] lg:text-xs text-muted-foreground">
          <Phone className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{lead.phone}</span>
        </div>
      )}
      {lead.ai_summary && (
        <p className="text-[9px] lg:text-[10px] text-muted-foreground bg-accent/10 border border-accent/20 rounded px-1.5 py-1 line-clamp-2">
          🤖 {lead.ai_summary}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground truncate">{lead.source ?? "—"}</span>
        <span className={cn("text-[10px] flex-shrink-0", isOverdue && (lead.pipeline_stage ?? "nuevo") === "nuevo" ? "text-destructive font-bold" : "text-muted-foreground")}>
          <Clock className="w-3 h-3 inline mr-0.5" />
          {hours}h
        </span>
      </div>
      {lead.estimated_value ? (
        <p className="text-xs font-semibold text-accent">${lead.estimated_value.toLocaleString("es-CL")}</p>
      ) : null}
    </div>
  );
}

/* ─── Desktop list view ─── */
function LeadListView({
  leads,
  onSelect,
  onStageChange,
  selection,
}: {
  leads: Lead[];
  onSelect: (l: Lead) => void;
  onStageChange: (id: string, stage: string) => void;
  selection: ReturnType<typeof useRowSelection<Lead>>;
}) {
  const { page, pageSize, totalPages, setPage, setPageSize, from, to } = usePagination("leads", leads.length);
  const paginated = leads.slice(from, to + 1);
  const headerState = selection.getSelectionStateFor(paginated);
  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm table-auto">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 w-10">
                <SelectionCheckbox
                  state={headerState}
                  onChange={() => selection.toggleAll(paginated)}
                  label="Seleccionar todos en esta página"
                />
              </th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Nombre</th>
              <th className="text-center px-3 py-2 font-medium whitespace-nowrap w-16">Prior.</th>
              <th className="text-left px-3 py-2 font-medium hidden sm:table-cell whitespace-nowrap">Contacto</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Urgencia</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Etapa</th>
              <th className="text-left px-3 py-2 font-medium hidden md:table-cell whitespace-nowrap">Fuente</th>
              <th className="text-left px-3 py-2 font-medium hidden md:table-cell whitespace-nowrap">Fecha</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(lead => {
              const isSel = selection.isSelected(lead.id);
              return (
                <tr
                  key={lead.id}
                  className={cn(
                    "border-b hover:bg-muted/30 cursor-pointer transition-colors",
                    isSel && "bg-primary/5",
                  )}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("[data-no-row-click]")) return;
                    onSelect(lead);
                  }}
                >
                  <td className="px-3 py-2">
                    <SelectionCheckbox
                      state={isSel}
                      onChange={() => selection.toggle(lead.id)}
                      label={`Seleccionar ${lead.name ?? "lead"}`}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium max-w-[180px] truncate">{lead.name ?? "—"}</td>
                  <td className="px-3 py-2 text-center"><PriorityBadge score={(() => { const c = lead.ai_classification as any; return c?.priority_score ?? null; })()} /></td>
                  <td className="px-3 py-2 text-xs hidden sm:table-cell">
                    <div className="truncate max-w-[160px]">{lead.email}</div>
                    <div className="text-muted-foreground">{lead.phone}</div>
                  </td>
                  <td className="px-3 py-2">
                    {lead.urgency && (
                      <Badge className={cn("text-[10px]", getUrgencyClasses(lead.urgency))} variant="secondary">
                        {URGENCY_LABELS[lead.urgency] ?? lead.urgency}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2" data-no-row-click>
                    <Select value={lead.pipeline_stage || "nuevo"} onValueChange={(v) => { onStageChange(lead.id, v); }}>
                      <SelectTrigger className="h-7 text-xs w-[120px]" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.emoji} {s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">{lead.source ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">{format(new Date(lead.created_at), "dd/MM HH:mm")}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalCount={leads.length}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel={{ singular: "lead", plural: "leads" }}
      />
    </div>
  );
}
