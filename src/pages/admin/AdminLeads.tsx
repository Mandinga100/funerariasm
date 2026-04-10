import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Phone, Mail, Clock, User, MessageSquare, Eye, LayoutGrid, List, Sparkles } from "lucide-react";
import { differenceInHours, format } from "date-fns";
import { es } from "date-fns/locale";
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
  { id: "nuevo", label: "🔵 Nuevo", color: "bg-blue-50 border-blue-200" },
  { id: "contactado", label: "🟡 Contactado", color: "bg-amber-50 border-amber-200" },
  { id: "cotizado", label: "🟠 Cotizado", color: "bg-orange-50 border-orange-200" },
  { id: "contratado", label: "🟢 Contratado", color: "bg-green-50 border-green-200" },
  { id: "cerrado", label: "⚫ Cerrado", color: "bg-gray-50 border-gray-200" },
];

const urgencyColor: Record<string, string> = {
  inmediata: "bg-red-100 text-red-800 border-red-300",
  normal: "bg-blue-100 text-blue-800 border-blue-300",
  previsión: "bg-green-100 text-green-800 border-green-300",
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [classifyingAll, setClassifyingAll] = useState(false);
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
    
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_stage: newStage } : l));
    
    const updates: { pipeline_stage: string; last_contacted_at?: string; status?: string } = { pipeline_stage: newStage };
    if (newStage === "contactado" || newStage === "cotizado" || newStage === "contratado") {
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Pipeline de Leads</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{filtered.length} contactos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className={cn("h-8 text-xs", classifyingAll && "animate-pulse")} onClick={handleClassifyAll} disabled={classifyingAll}>
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">{classifyingAll ? "Clasificando..." : "Clasificar con IA"}</span>
            <span className="sm:hidden">{classifyingAll ? "..." : "IA"}</span>
          </Button>
          <Select value={filterUrgency} onValueChange={setFilterUrgency}>
            <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs">
              <SelectValue placeholder="Urgencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="inmediata">🔴 Inmediata</SelectItem>
              <SelectItem value="normal">🔵 Normal</SelectItem>
              <SelectItem value="previsión">🟢 Previsión</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            <Button size="sm" variant={viewMode === "kanban" ? "default" : "ghost"} className="h-8 px-2" onClick={() => setViewMode("kanban")}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button size="sm" variant={viewMode === "list" ? "default" : "ghost"} className="h-8 px-2" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory sm:snap-none" style={{ minHeight: "calc(100vh - 240px)" }}>
            {PIPELINE_STAGES.map(stage => (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-shrink-0 w-[200px] sm:w-[230px] lg:w-[260px] rounded-lg border-2 p-1.5 sm:p-2 transition-colors snap-start",
                      stage.color,
                      snapshot.isDraggingOver && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-1">
                      <span className="text-xs sm:text-sm font-semibold truncate">{stage.label}</span>
                      <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-4 sm:h-5 ml-1">{leadsByStage[stage.id]?.length ?? 0}</Badge>
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
                                "bg-background rounded-md border p-2 sm:p-3 shadow-sm cursor-grab hover:shadow-md transition-shadow",
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
        <LeadListView leads={filtered} onSelect={setSelectedLead} onStageChange={async (id, stage) => {
          await supabase.from("contact_leads").update({ pipeline_stage: stage }).eq("id", id);
          loadLeads();
        }} />
      )}

      {/* Lead Detail Sheet */}
      <LeadDetailSheet lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={loadLeads} />
    </div>
  );
}

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

function LeadListView({ leads, onSelect, onStageChange }: { leads: Lead[]; onSelect: (l: Lead) => void; onStageChange: (id: string, stage: string) => void }) {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Nombre</th>
            <th className="text-left p-3 font-medium">Contacto</th>
            <th className="text-left p-3 font-medium">Urgencia</th>
            <th className="text-left p-3 font-medium">Etapa</th>
            <th className="text-left p-3 font-medium">Fuente</th>
            <th className="text-left p-3 font-medium">Fecha</th>
            <th className="text-left p-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr key={lead.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onSelect(lead)}>
              <td className="p-3 font-medium">{lead.name ?? "—"}</td>
              <td className="p-3 text-xs">
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
                    {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-3 text-xs text-muted-foreground">{lead.source ?? "—"}</td>
              <td className="p-3 text-xs text-muted-foreground">{format(new Date(lead.created_at), "dd/MM HH:mm")}</td>
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
