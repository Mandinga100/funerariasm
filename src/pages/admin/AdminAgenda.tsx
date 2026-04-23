import { useEffect, useMemo, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Calendar as CalendarIcon, LayoutGrid, RefreshCw, Download, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import KpiCard from "@/components/admin/KpiCard";
import {
  AgendaEvent,
  AgendaEventType,
  AgendaPriority,
  AgendaStatus,
  EVENT_TYPES,
  PRIORITIES,
  STATUS_COLUMNS,
  statusOf,
} from "@/lib/agenda-config";
import AgendaCard from "@/components/admin/agenda/AgendaCard";
import AgendaEventModal from "@/components/admin/agenda/AgendaEventModal";
import AgendaConflictDialog, { type ConflictItem } from "@/components/admin/agenda/AgendaConflictDialog";
import { downloadCSV, downloadXLSX, type ExportColumn } from "@/lib/admin-export";

const ACTIVE_STATUSES: AgendaStatus[] = ["programado", "confirmado", "en_curso"];

type DateRange = "today" | "tomorrow" | "week" | "month" | "all";

interface UserOpt { user_id: string; display_name: string | null; }
interface CaseRef { id: string; case_number: string; }

export default function AdminAgenda() {
  const { isCeo } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [cases, setCases] = useState<CaseRef[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"kanban" | "calendar">("kanban");
  const [search, setSearch] = useState("");
  const [filterRange, setFilterRange] = useState<DateRange>("week");
  const [filterType, setFilterType] = useState<AgendaEventType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<AgendaPriority | "all">("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<AgendaStatus | undefined>();

  // Drag conflict confirmation
  const [conflictDlg, setConflictDlg] = useState<{
    open: boolean;
    conflicts: ConflictItem[];
    pending: { eventId: string; newStatus: AgendaStatus; assigneeName: string | null } | null;
  }>({ open: false, conflicts: [], pending: null });

  // Cargar datos
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: ev }, { data: pf }, { data: cs }] = await Promise.all([
      supabase.from("agenda_events").select("*").order("start_at", { ascending: true }),
      supabase.from("profiles").select("user_id, display_name"),
      supabase.from("service_cases").select("id, case_number").limit(500),
    ]);
    setEvents((ev as AgendaEvent[]) ?? []);
    setUsers((pf as UserOpt[]) ?? []);
    setCases((cs as CaseRef[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("agenda-events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda_events" }, () => fetchAll())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [fetchAll]);

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach(u => m.set(u.user_id, u.display_name ?? u.user_id.slice(0, 8)));
    return m;
  }, [users]);

  const caseMap = useMemo(() => {
    const m = new Map<string, string>();
    cases.forEach(c => m.set(c.id, c.case_number));
    return m;
  }, [cases]);

  // Filtrado
  const filtered = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday); endToday.setDate(endToday.getDate() + 1);
    const endTomorrow = new Date(endToday); endTomorrow.setDate(endTomorrow.getDate() + 1);
    const endWeek = new Date(startToday); endWeek.setDate(endWeek.getDate() + 7);
    const endMonth = new Date(startToday); endMonth.setMonth(endMonth.getMonth() + 1);

    return events.filter(e => {
      const start = new Date(e.start_at);
      // Rango
      if (filterRange === "today" && (start < startToday || start >= endToday)) return false;
      if (filterRange === "tomorrow" && (start < endToday || start >= endTomorrow)) return false;
      if (filterRange === "week" && (start < startToday || start >= endWeek)) return false;
      if (filterRange === "month" && (start < startToday || start >= endMonth)) return false;
      // Tipo
      if (filterType !== "all" && e.event_type !== filterType) return false;
      // Prioridad
      if (filterPriority !== "all" && e.priority !== filterPriority) return false;
      // Asignado
      if (filterAssignee !== "all") {
        if (filterAssignee === "__none__") { if (e.assigned_to) return false; }
        else if (e.assigned_to !== filterAssignee) return false;
      }
      // Búsqueda
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = [e.title, e.description, e.location_name, e.comuna, e.contact_name, e.contact_phone].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, filterRange, filterType, filterPriority, filterAssignee, search]);

  const grouped = useMemo(() => {
    const g: Record<AgendaStatus, AgendaEvent[]> = {
      programado: [], confirmado: [], en_curso: [], finalizado: [], cancelado: [], reprogramado: [],
    };
    filtered.forEach(e => { (g[e.status] ?? g.programado).push(e); });
    return g;
  }, [filtered]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday); endToday.setDate(endToday.getDate() + 1);
    const todayEvents = events.filter(e => { const s = new Date(e.start_at); return s >= startToday && s < endToday; });
    const overdue = events.filter(e => new Date(e.end_at) < now && !["finalizado", "cancelado"].includes(e.status));
    const critical = events.filter(e => e.priority === "critica" && !["finalizado", "cancelado"].includes(e.status));
    const upcoming = events.filter(e => new Date(e.start_at) > now && e.status !== "cancelado").length;
    return { today: todayEvents.length, overdue: overdue.length, critical: critical.length, upcoming };
  }, [events]);

  // Drag & drop
  const onDragStart = (e: React.DragEvent, ev: AgendaEvent) => {
    e.dataTransfer.setData("text/event-id", ev.id);
    e.dataTransfer.effectAllowed = "move";
  };
  const applyStatusChange = useCallback(async (id: string, newStatus: AgendaStatus, title: string) => {
    const { error } = await supabase.from("agenda_events").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "No se pudo mover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Estado actualizado", description: `${title} → ${statusOf(newStatus).label}` });
    }
  }, [toast]);

  const onDropToColumn = async (e: React.DragEvent, status: AgendaStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/event-id");
    if (!id) return;
    const ev = events.find(x => x.id === id);
    if (!ev || ev.status === status) return;

    // Si el evento pasa a un estado ACTIVO y tiene responsable, validar conflictos
    if (ev.assigned_to && ACTIVE_STATUSES.includes(status)) {
      const { data, error } = await supabase.rpc("detect_agenda_conflicts", {
        _user_id: ev.assigned_to,
        _start: ev.start_at,
        _end: ev.end_at,
        _exclude_event_id: ev.id,
      });
      const list: ConflictItem[] = (data ?? []).map((r) => ({
        id: r.event_id,
        title: r.title,
        start_at: r.start_at,
        end_at: r.end_at,
      }));
      if (!error && list.length > 0) {
        setConflictDlg({
          open: true,
          conflicts: list,
          pending: {
            eventId: ev.id,
            newStatus: status,
            assigneeName: userMap.get(ev.assigned_to) ?? null,
          },
        });
        return; // Bloquear hasta confirmación explícita
      }
    }

    await applyStatusChange(ev.id, status, ev.title);
  };

  const confirmConflictAndMove = async () => {
    const p = conflictDlg.pending;
    setConflictDlg({ open: false, conflicts: [], pending: null });
    if (!p) return;
    const ev = events.find(x => x.id === p.eventId);
    await applyStatusChange(p.eventId, p.newStatus, ev?.title ?? "Evento");
  };

  const exportCols: ExportColumn<AgendaEvent>[] = [
    { key: "title", label: "Título", accessor: e => e.title },
    { key: "type", label: "Tipo", accessor: e => e.event_type },
    { key: "status", label: "Estado", accessor: e => e.status },
    { key: "priority", label: "Prioridad", accessor: e => e.priority },
    { key: "start_at", label: "Inicio", accessor: e => new Date(e.start_at).toLocaleString("es-CL") },
    { key: "end_at", label: "Fin", accessor: e => new Date(e.end_at).toLocaleString("es-CL") },
    { key: "location", label: "Lugar", accessor: e => e.location_name ?? "" },
    { key: "comuna", label: "Comuna", accessor: e => e.comuna ?? "" },
    { key: "assignee", label: "Responsable", accessor: e => userMap.get(e.assigned_to ?? "") ?? "" },
    { key: "case", label: "Caso", accessor: e => caseMap.get(e.service_case_id ?? "") ?? "" },
    { key: "contact_phone", label: "Tel. contacto", accessor: e => e.contact_phone ?? "" },
  ];

  const openNew = (status?: AgendaStatus) => { setEditingEvent(null); setDefaultStatusForNew(status); setModalOpen(true); };
  const openEdit = (ev: AgendaEvent) => { setEditingEvent(ev); setDefaultStatusForNew(undefined); setModalOpen(true); };

  return (
    <div className="space-y-4">
      <Helmet><title>Agenda · CRM Funeraria Santa Margarita</title></Helmet>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda Operativa</h1>
          <p className="text-sm text-muted-foreground">Coordina velorios, ceremonias, traslados y seguimientos en un solo tablero.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />Refrescar
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(filtered, exportCols, "agenda")}>
            <Download className="w-4 h-4 mr-1" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadXLSX(filtered, exportCols, "agenda")}>
            <Download className="w-4 h-4 mr-1" />XLSX
          </Button>
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="w-4 h-4 mr-1" />Nuevo evento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Hoy" value={kpis.today} icon={CalendarIcon} />
        <KpiCard label="Próximos" value={kpis.upcoming} icon={CalendarIcon} />
        <KpiCard label="Vencidos sin cerrar" value={kpis.overdue} icon={AlertTriangle} accentClassName={kpis.overdue > 0 ? "bg-amber-500" : undefined} />
        <KpiCard label="Críticos activos" value={kpis.critical} icon={AlertTriangle} accentClassName={kpis.critical > 0 ? "bg-rose-500" : undefined} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por título, lugar, contacto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterRange} onValueChange={v => setFilterRange(v as DateRange)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="tomorrow">Mañana</SelectItem>
            <SelectItem value="week">Próximos 7 días</SelectItem>
            <SelectItem value="month">Próximos 30 días</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={v => setFilterType(v as AgendaEventType | "all")}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {EVENT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.emoji} {t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={v => setFilterPriority(v as AgendaPriority | "all")}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda prioridad</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los responsables</SelectItem>
            <SelectItem value="__none__">Sin asignar</SelectItem>
            {users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name ?? u.user_id.slice(0, 8)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={v => setView(v as "kanban" | "calendar")}>
          <TabsList>
            <TabsTrigger value="kanban"><LayoutGrid className="w-4 h-4 mr-1" />Kanban</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarIcon className="w-4 h-4 mr-1" />Lista por día</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KANBAN */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {STATUS_COLUMNS.map(col => {
            const items = grouped[col.id];
            return (
              <div
                key={col.id}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDropToColumn(e, col.id)}
                className="rounded-xl border bg-muted/30 flex flex-col min-h-[400px] max-h-[calc(100vh-280px)]"
              >
                <div className="p-3 border-b sticky top-0 bg-muted/50 backdrop-blur rounded-t-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", col.color)} aria-hidden />
                      <h3 className="text-sm font-semibold truncate">{col.label}</h3>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{items.length}</Badge>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openNew(col.id)} title="Crear en esta columna">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{col.description}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Sin eventos</p>
                  ) : (
                    items.map(ev => (
                      <AgendaCard
                        key={ev.id}
                        event={ev}
                        onClick={() => openEdit(ev)}
                        assigneeName={ev.assigned_to ? userMap.get(ev.assigned_to) : null}
                        caseRef={ev.service_case_id ? caseMap.get(ev.service_case_id) : null}
                        draggable
                        onDragStart={e => onDragStart(e, ev)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LISTA POR DÍA */}
      {view === "calendar" && <ListByDay events={filtered} userMap={userMap} caseMap={caseMap} onEdit={openEdit} />}

      <AgendaEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={editingEvent}
        defaultStatus={defaultStatusForNew}
        onSaved={fetchAll}
      />
    </div>
  );
}

function ListByDay({ events, userMap, caseMap, onEdit }: {
  events: AgendaEvent[];
  userMap: Map<string, string>;
  caseMap: Map<string, string>;
  onEdit: (e: AgendaEvent) => void;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>();
    events.forEach(e => {
      const d = new Date(e.start_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (groups.length === 0) {
    return <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No hay eventos en el rango seleccionado.</div>;
  }

  return (
    <div className="space-y-4">
      {groups.map(([date, items]) => (
        <div key={date} className="rounded-xl border overflow-hidden">
          <div className="px-4 py-2 bg-muted/40 border-b">
            <h3 className="text-sm font-semibold">
              {new Date(date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              <span className="ml-2 text-xs text-muted-foreground font-normal">({items.length} evento{items.length !== 1 ? "s" : ""})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 p-3">
            {items.map(ev => (
              <AgendaCard
                key={ev.id}
                event={ev}
                onClick={() => onEdit(ev)}
                assigneeName={ev.assigned_to ? userMap.get(ev.assigned_to) : null}
                caseRef={ev.service_case_id ? caseMap.get(ev.service_case_id) : null}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
