import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  last_contacted_at: string | null;
  created_at: string;
  message: string | null;
  comuna: string | null;
  selected_plan: string | null;
}

const PIPELINE_STAGES = [
  { id: "nuevo", label: "Nuevo", emoji: "🔵", color: "bg-blue-50 border-blue-200", dotColor: "bg-blue-500" },
  { id: "contactado", label: "Contactado", emoji: "🟡", color: "bg-amber-50 border-amber-200", dotColor: "bg-amber-500" },
  { id: "cotizado", label: "Cotizado", emoji: "🟠", color: "bg-orange-50 border-orange-200", dotColor: "bg-orange-500" },
  { id: "contratado", label: "Contratado", emoji: "🟢", color: "bg-green-50 border-green-200", dotColor: "bg-green-500" },
  { id: "cerrado", label: "Cerrado", emoji: "⚫", color: "bg-gray-50 border-gray-200", dotColor: "bg-gray-500" },
];

const urgencyColor: Record<string, string> = {
  inmediata: "bg-red-100 text-red-800 border-red-300",
  normal: "bg-blue-100 text-blue-800 border-blue-300",
  "previsión": "bg-green-100 text-green-800 border-green-300",
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [classifyingAll, setClassifyingAll] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({ nuevo: true, contactado: true });
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    loadLeads();
    const channel = supabase
      .channel("crm-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_leads" }, () => loadLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadLeads = async () => {
    const { data } = await supabase
      .from("contact_leads")
      .select("id, name, email, phone, contact_type, intent, source, urgency, status, pipeline_stage, estimated_value, next_follow_up, ai_summary, last_contacted_at, created_at, message, comuna, selected_plan")
      .order("created_at", { ascending: false })
      .limit(500);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filterUrgency !== "all" && l.urgency !== filterUrgency) return false;
      return true;
    });
  }, [leads, filterUrgency]);

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
    }
  };

  const handleStageChange = async (id: string, stage: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, pipeline_stage: stage } : l));
    await supabase.from("contact_leads").update({ pipeline_stage: stage }).eq("id", id);
    loadLeads();
  };

  const handleClassifyAll = async () => {
    setClassifyingAll(true);
    try {
      const unclassified = leads.filter(l => !l.ai_summary && l.message);
      for (const lead of unclassified.slice(0, 10)) {
        await supabase.functions.invoke("classify-lead", { body: { leadId: lead.id } });
      }
      toast({ title: "Clasificación completada", description: `${Math.min(unclassified.length, 10)} leads clasificados con IA` });
      loadLeads();
    } catch {
      toast({ title: "Error", description: "Error en clasificación IA", variant: "destructive" });
    }
    setClassifyingAll(false);
  };

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Pipeline de Leads</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} contactos</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button size="sm" variant="outline" className={cn("h-8 text-xs", classifyingAll && "animate-pulse")} onClick={handleClassifyAll} disabled={classifyingAll}>
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">{classifyingAll ? "Clasificando..." : "Clasificar con IA"}</span>
            <span className="sm:hidden">IA</span>
          </Button>
          <Select value={filterUrgency} onValueChange={setFilterUrgency}>
            <SelectTrigger className="w-[100px] sm:w-[140px] h-8 text-xs">
              <SelectValue placeholder="Urgencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="inmediata">🔴 Inmediata</SelectItem>
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
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 240px)" }}>
            {PIPELINE_STAGES.map(stage => (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-shrink-0 w-[230px] lg:w-[260px] rounded-lg border-2 p-2 transition-colors",
                      stage.color,
                      snapshot.isDraggingOver && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-sm font-semibold">{stage.emoji} {stage.label}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{leadsByStage[stage.id]?.length ?? 0}</Badge>
                    </div>
                    <div className="space-y-2 min-h-[100px]">
                      {(leadsByStage[stage.id] ?? []).map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "bg-background rounded-md border p-3 shadow-sm cursor-grab hover:shadow-md transition-shadow",
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
    <div className="space-y-2">
      {PIPELINE_STAGES.map(stage => {
        const stageLeads = leadsByStage[stage.id] ?? [];
        const isExpanded = expandedStages[stage.id] ?? false;
        return (
          <div key={stage.id} className={cn("rounded-lg border-2 overflow-hidden", stage.color)}>
            <button
              onClick={() => onToggle(stage.id)}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", stage.dotColor)} />
                <span className="text-sm font-semibold">{stage.label}</span>
                <Badge variant="secondary" className="text-[10px] h-5">{stageLeads.length}</Badge>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {isExpanded && stageLeads.length > 0 && (
              <div className="px-2 pb-2 space-y-2">
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
              <p className="px-3 pb-3 text-xs text-muted-foreground">Sin leads en esta etapa</p>
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
      className="bg-background rounded-lg border p-3 shadow-sm active:shadow-md transition-shadow"
      onClick={() => onSelect(lead)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-medium text-sm leading-tight flex-1">{lead.name ?? "Sin nombre"}</p>
        {lead.urgency && (
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium border whitespace-nowrap", urgencyColor[lead.urgency] ?? "")}>
            {lead.urgency}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        {lead.phone && (
          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
        )}
        <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{hours}h</span>
      </div>

      {lead.ai_summary && (
        <p className="text-[10px] text-muted-foreground bg-violet-50 rounded px-2 py-1 line-clamp-2 mb-2">
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
          <span className="text-xs font-semibold text-green-700">${lead.estimated_value.toLocaleString("es-CL")}</span>
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
  const isOverdue = lead.urgency === "inmediata" ? hours >= 2 : lead.urgency === "normal" ? hours >= 24 : hours >= 72;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <p className="font-medium text-sm leading-tight">{lead.name ?? "Sin nombre"}</p>
        {lead.urgency && (
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium border", urgencyColor[lead.urgency] ?? "")}>
            {lead.urgency}
          </span>
        )}
      </div>
      {lead.phone && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="w-3 h-3" /> {lead.phone}
        </div>
      )}
      {lead.ai_summary && (
        <p className="text-[10px] text-muted-foreground bg-violet-50 rounded px-1.5 py-1 line-clamp-2">
          🤖 {lead.ai_summary}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{lead.source ?? "—"}</span>
        <span className={cn("text-[10px]", isOverdue && (lead.pipeline_stage ?? "nuevo") === "nuevo" ? "text-red-600 font-bold" : "text-muted-foreground")}>
          <Clock className="w-3 h-3 inline mr-0.5" />
          {hours}h
        </span>
      </div>
      {lead.estimated_value ? (
        <p className="text-xs font-semibold text-green-700">${lead.estimated_value.toLocaleString("es-CL")}</p>
      ) : null}
    </div>
  );
}

/* ─── Desktop list view ─── */
function LeadListView({ leads, onSelect, onStageChange }: { leads: Lead[]; onSelect: (l: Lead) => void; onStageChange: (id: string, stage: string) => void }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Nombre</th>
            <th className="text-left p-3 font-medium hidden sm:table-cell">Contacto</th>
            <th className="text-left p-3 font-medium">Urgencia</th>
            <th className="text-left p-3 font-medium">Etapa</th>
            <th className="text-left p-3 font-medium hidden md:table-cell">Fuente</th>
            <th className="text-left p-3 font-medium hidden md:table-cell">Fecha</th>
            <th className="text-left p-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr key={lead.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onSelect(lead)}>
              <td className="p-3 font-medium">{lead.name ?? "—"}</td>
              <td className="p-3 text-xs hidden sm:table-cell">
                <div>{lead.email}</div>
                <div className="text-muted-foreground">{lead.phone}</div>
              </td>
              <td className="p-3">
                {lead.urgency && <Badge className={cn("text-[10px]", urgencyColor[lead.urgency])} variant="secondary">{lead.urgency}</Badge>}
              </td>
              <td className="p-3">
                <Select value={lead.pipeline_stage || "nuevo"} onValueChange={(v) => { onStageChange(lead.id, v); }}>
                  <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.emoji} {s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{lead.source ?? "—"}</td>
              <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{format(new Date(lead.created_at), "dd/MM HH:mm")}</td>
              <td className="p-3">
                <Button size="sm" variant="ghost" className="h-7"><Eye className="w-3.5 h-3.5" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
