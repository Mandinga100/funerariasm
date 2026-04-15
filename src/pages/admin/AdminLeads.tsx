import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Phone, Clock, Eye, LayoutGrid, List, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { differenceInHours, format } from "date-fns";
import { es } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import LeadDetailSheet from "@/components/admin/crm/LeadDetailSheet";

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
  const color =
    score >= 80 ? "bg-red-500 text-white" :
    score >= 60 ? "bg-orange-500 text-white" :
    score >= 40 ? "bg-amber-400 text-amber-950" :
    score >= 20 ? "bg-blue-400 text-white" :
    "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-100";
  return (
    <span className={cn("text-[8px] lg:text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums leading-none", color)}>
      {score}
    </span>
  );
}

const PIPELINE_STAGES = [
  { id: "nuevo", label: "Nuevo", emoji: "🔵", color: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", dotColor: "bg-blue-500" },
  { id: "contactado", label: "Contactado", emoji: "🟡", color: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800", dotColor: "bg-amber-500" },
  { id: "cotizado", label: "Cotizado", emoji: "🟠", color: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800", dotColor: "bg-orange-500" },
  { id: "contratado", label: "Contratado", emoji: "🟢", color: "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800", dotColor: "bg-green-500" },
  { id: "cerrado", label: "Cerrado", emoji: "⚫", color: "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700", dotColor: "bg-gray-500" },
];

const urgencyColor: Record<string, string> = {
  inmediata: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800",
  immediate: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800",
  normal: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800",
  "previsión": "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800",
};

const URGENCY_LABELS: Record<string, string> = {
  inmediata: "Urgente",
  immediate: "Urgente",
  normal: "Normal",
  "previsión": "Previsión",
};

export default function AdminLeads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterUrgency, setFilterUrgency] = useState(searchParams.get("urgency") ?? "all");
  const [filterStage, setFilterStage] = useState(searchParams.get("stage") ?? "all");
  const [filterOverdue, setFilterOverdue] = useState(searchParams.get("filter") === "overdue");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [classifyingAll, setClassifyingAll] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({ nuevo: true, contactado: true });
  const isMobile = useIsMobile();
  const { toast } = useToast();

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

  // For kanban mode, ignore filterStage so cards don't disappear when dragged
  const filtered = useMemo(() => {
    const now = new Date();
    const isKanban = viewMode === "kanban" && !isMobile;
    return leads.filter(l => {
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
  }, [leads, filterUrgency, filterStage, filterOverdue, viewMode, isMobile]);

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
          <Button size="sm" variant="outline" className={cn("h-8 text-xs", classifyingAll && "animate-pulse")} onClick={handleClassifyAll} disabled={classifyingAll}>
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">{classifyingAll ? "Clasificando..." : "Clasificar con IA"}</span>
            <span className="sm:hidden">IA</span>
          </Button>
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

      {/* Mobile: Accordion-style stacked stages */}
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
          <div className="grid grid-cols-5 gap-2 lg:gap-3" style={{ minHeight: "calc(100vh - 240px)" }}>
            {PIPELINE_STAGES.map(stage => (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "rounded-lg border-2 p-1.5 lg:p-2 transition-colors min-w-0",
                      stage.color,
                      snapshot.isDraggingOver && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <span className="text-xs lg:text-sm font-semibold truncate">{stage.emoji} {stage.label}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 flex-shrink-0">{leadsByStage[stage.id]?.length ?? 0}</Badge>
                    </div>
                    <div className="space-y-1.5 min-h-[80px]">
                      {(leadsByStage[stage.id] ?? []).map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "bg-background rounded-md border p-2 lg:p-3 shadow-sm cursor-grab hover:shadow-md transition-shadow",
                                snapshot.isDragging && "shadow-lg ring-2 ring-primary rotate-2"
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
        </DragDropContext>
      ) : (
        <LeadListView leads={filtered} onSelect={setSelectedLead} onStageChange={handleStageChange} />
      )}

      <LeadDetailSheet lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={loadLeads} />
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
      className="bg-background rounded-lg border p-2.5 shadow-sm active:shadow-md transition-shadow"
      onClick={() => onSelect(lead)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <PriorityBadge score={getPriorityScore(lead)} />
          <p className="font-medium text-sm leading-tight truncate">{lead.name ?? "Sin nombre"}</p>
        </div>
        {lead.urgency && (
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium border whitespace-nowrap", urgencyColor[lead.urgency] ?? "")}>
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
        <p className="text-[10px] text-muted-foreground bg-violet-50 dark:bg-violet-950/30 rounded px-2 py-1 line-clamp-2 mb-1.5">
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
          <span className="text-xs font-semibold text-green-700 dark:text-green-400">${lead.estimated_value.toLocaleString("es-CL")}</span>
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
          <span className={cn("text-[8px] lg:text-[9px] px-1 py-0.5 rounded-full font-medium border whitespace-nowrap flex-shrink-0", urgencyColor[lead.urgency] ?? "")}>
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
        <p className="text-[9px] lg:text-[10px] text-muted-foreground bg-violet-50 dark:bg-violet-950/30 rounded px-1.5 py-1 line-clamp-2">
          🤖 {lead.ai_summary}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground truncate">{lead.source ?? "—"}</span>
        <span className={cn("text-[10px] flex-shrink-0", isOverdue && (lead.pipeline_stage ?? "nuevo") === "nuevo" ? "text-red-600 font-bold" : "text-muted-foreground")}>
          <Clock className="w-3 h-3 inline mr-0.5" />
          {hours}h
        </span>
      </div>
      {lead.estimated_value ? (
        <p className="text-xs font-semibold text-green-700 dark:text-green-400">${lead.estimated_value.toLocaleString("es-CL")}</p>
      ) : null}
    </div>
  );
}

/* ─── Desktop list view ─── */
function LeadListView({ leads, onSelect, onStageChange }: { leads: Lead[]; onSelect: (l: Lead) => void; onStageChange: (id: string, stage: string) => void }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm table-auto">
        <thead>
          <tr className="border-b bg-muted/50">
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
          {leads.map(lead => (
            <tr key={lead.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onSelect(lead)}>
              <td className="px-3 py-2 font-medium max-w-[180px] truncate">{lead.name ?? "—"}</td>
              <td className="px-3 py-2 text-center"><PriorityBadge score={(() => { const c = lead.ai_classification as any; return c?.priority_score ?? null; })()} /></td>
              <td className="px-3 py-2 text-xs hidden sm:table-cell">
                <div className="truncate max-w-[160px]">{lead.email}</div>
                <div className="text-muted-foreground">{lead.phone}</div>
              </td>
              <td className="px-3 py-2">
                {lead.urgency && (
                  <Badge className={cn("text-[10px]", urgencyColor[lead.urgency])} variant="secondary">
                    {URGENCY_LABELS[lead.urgency] ?? lead.urgency}
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
