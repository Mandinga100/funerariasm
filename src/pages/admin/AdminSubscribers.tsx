import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortableTable, type SortableColumn } from "@/components/admin/SortableTable";
import { useToast } from "@/hooks/use-toast";
import { Mail, Users, RefreshCw, CalendarPlus, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SubscribersTrendChart } from "@/components/admin/SubscribersTrendChart";
import { SubscribersSourceChart } from "@/components/admin/SubscribersSourceChart";
import { getSourceLabel } from "@/lib/subscription-source";
import { usePersistentFilters } from "@/hooks/use-persistent-filters";
import KpiCard from "@/components/admin/KpiCard";
import KpiDetailModal, { type KpiDetailColumn } from "@/components/admin/KpiDetailModal";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import { useRowSelection } from "@/hooks/use-row-selection";
import { downloadCSV, downloadXLSX, todayStamp, kpiColumnsToExport, type ExportColumn } from "@/lib/admin-export";

interface Subscriber {
  id: string;
  email: string;
  source: string | null;
  metadata: {
    name?: string;
    last_campaign_at?: string;
    last_campaign_subject?: string;
  } | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

type KpiKey = "total" | "active" | "month" | "unsubscribed";

const exportColumns: ExportColumn<Subscriber>[] = [
  { key: "email", label: "Email", accessor: (r) => r.email },
  { key: "name", label: "Nombre", accessor: (r) => r.metadata?.name ?? "" },
  { key: "source", label: "Origen", accessor: (r) => getSourceLabel(r.source) },
  { key: "subscribed_at", label: "Fecha de suscripción", accessor: (r) => format(new Date(r.subscribed_at), "yyyy-MM-dd HH:mm") },
  { key: "status", label: "Estado", accessor: (r) => (r.unsubscribed_at ? "Desuscrito" : "Activo") },
  { key: "last_campaign", label: "Última campaña", accessor: (r) => r.metadata?.last_campaign_subject ?? "" },
  { key: "last_campaign_at", label: "Fecha última campaña", accessor: (r) => r.metadata?.last_campaign_at ? format(new Date(r.metadata.last_campaign_at), "yyyy-MM-dd HH:mm") : "" },
];

export default function AdminSubscribers() {
  const { toast } = useToast();
  const { isCeo } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { filters, setFilter } = usePersistentFilters("admin_subscribers", {
    search: "",
    sourceFilter: "all",
    dateFrom: "",
    dateTo: "",
    rangeDays: 30,
  });
  const { search, sourceFilter, dateFrom, dateTo, rangeDays } = filters;

  const selection = useRowSelection<Subscriber>((r) => r.id);

  const fetchSubscribers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_subscribers")
      .select("id, email, source, metadata, subscribed_at, unsubscribed_at")
      .order("subscribed_at", { ascending: false });
    if (error) {
      toast({ title: "Error al cargar suscriptores", description: error.message, variant: "destructive" });
    } else {
      setSubscribers((data ?? []) as Subscriber[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const sources = useMemo(() => {
    const set = new Set<string>();
    subscribers.forEach((s) => s.source && set.add(s.source));
    return Array.from(set);
  }, [subscribers]);

  const filtered = useMemo(() => {
    return subscribers.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        const name = (s.metadata?.name || "").toLowerCase();
        if (!s.email.toLowerCase().includes(q) && !name.includes(q)) return false;
      }
      if (sourceFilter !== "all" && s.source !== sourceFilter) return false;
      if (dateFrom && new Date(s.subscribed_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(s.subscribed_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [subscribers, search, sourceFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const active = subscribers.filter((s) => !s.unsubscribed_at);
    const unsubscribed = subscribers.filter((s) => !!s.unsubscribed_at);
    const thisMonth = subscribers.filter((s) => {
      const d = new Date(s.subscribed_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      total: subscribers.length,
      active: active.length,
      activeRows: active,
      unsubscribed: unsubscribed.length,
      unsubscribedRows: unsubscribed,
      thisMonth: thisMonth.length,
      thisMonthRows: thisMonth,
    };
  }, [subscribers]);

  const kpiModal = useMemo<{ title: string; description: string; rows: Subscriber[] } | null>(() => {
    if (!activeKpi) return null;
    if (activeKpi === "total") return { title: "Todos los suscriptores", description: "Listado completo del blog.", rows: subscribers };
    if (activeKpi === "active") return { title: "Suscriptores activos", description: "Reciben campañas de email.", rows: stats.activeRows };
    if (activeKpi === "month") return { title: "Suscriptores del mes en curso", description: "Nuevas suscripciones este mes.", rows: stats.thisMonthRows };
    if (activeKpi === "unsubscribed") return { title: "Suscriptores desuscritos", description: "Han optado por no recibir más campañas.", rows: stats.unsubscribedRows };
    return null;
  }, [activeKpi, subscribers, stats]);

  const kpiColumns: KpiDetailColumn<Subscriber>[] = [
    { key: "email", label: "Email", cell: (r) => <span className="font-mono text-xs">{r.email}</span> },
    { key: "name", label: "Nombre", cell: (r) => r.metadata?.name || <span className="text-muted-foreground italic">—</span> },
    { key: "source", label: "Origen", cell: (r) => <Badge variant="outline" className="text-[10px]">{getSourceLabel(r.source)}</Badge> },
    {
      key: "subscribed_at",
      label: "Fecha",
      cell: (r) => <span className="text-xs text-muted-foreground">{format(new Date(r.subscribed_at), "dd MMM yyyy", { locale: es })}</span>,
    },
    {
      key: "status",
      label: "Estado",
      cell: (r) =>
        r.unsubscribed_at ? (
          <Badge variant="destructive" className="text-[10px]">Desuscrito</Badge>
        ) : (
          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Activo</Badge>
        ),
    },
  ];

  const exportRows = (rows: Subscriber[], kind: "csv" | "xlsx", base = "suscriptores") => {
    if (rows.length === 0) {
      toast({ title: "Sin datos", description: "No hay registros para exportar." });
      return;
    }
    const filename = `${base}-${todayStamp()}`;
    if (kind === "csv") downloadCSV(rows, exportColumns, filename);
    else downloadXLSX(rows, exportColumns, filename, "Suscriptores");
    toast({ title: "Exportación completada", description: `${rows.length} suscriptores exportados.` });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    setDeleting(true);
    const { error } = await supabase.from("blog_subscribers").delete().in("id", ids);
    setDeleting(false);
    if (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
      return;
    }
    logAudit({
      action: "delete",
      module: "subscribers",
      description: `Eliminó ${ids.length} suscriptor(es)`,
      entity_type: "blog_subscribers",
      new_data: { ids },
    });
    toast({ title: "Eliminados", description: `${ids.length} suscriptor(es) eliminados.` });
    selection.clear();
    setConfirmDeleteOpen(false);
    fetchSubscribers();
  };

  const clearFilters = () => {
    setFilter("search", "");
    setFilter("sourceFilter", "all");
    setFilter("dateFrom", "");
    setFilter("dateTo", "");
  };

  const headerState = selection.getSelectionStateFor(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suscriptores del Blog</h1>
          <p className="text-sm text-muted-foreground">Gestione la lista de suscriptores y exporte para campañas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSubscribers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPIs interactivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total"
          value={stats.total}
          icon={Users}
          onClick={stats.total > 0 ? () => setActiveKpi("total") : undefined}
          hint={stats.total > 0 ? "Ver todos" : undefined}
        />
        <KpiCard
          label="Activos"
          value={stats.active}
          icon={UserCheck}
          accentClassName="bg-primary"
          onClick={stats.active > 0 ? () => setActiveKpi("active") : undefined}
          hint={stats.active > 0 ? "Ver activos" : undefined}
        />
        <KpiCard
          label="Este mes"
          value={stats.thisMonth}
          icon={CalendarPlus}
          onClick={stats.thisMonth > 0 ? () => setActiveKpi("month") : undefined}
          hint={stats.thisMonth > 0 ? "Ver del mes" : undefined}
        />
        <KpiCard
          label="Desuscritos"
          value={stats.unsubscribed}
          icon={UserX}
          accentClassName="bg-destructive"
          onClick={stats.unsubscribed > 0 ? () => setActiveKpi("unsubscribed") : undefined}
          hint={stats.unsubscribed > 0 ? "Ver desuscritos" : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SubscribersTrendChart
          subscribedDates={subscribers.map((s) => s.subscribed_at)}
          days={rangeDays}
          onRangeChange={(d) => setFilter("rangeDays", d)}
          rangeOptions={[7, 30, 90]}
        />
        <SubscribersSourceChart
          sources={subscribers
            .filter((s) => {
              const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
              return new Date(s.subscribed_at).getTime() >= cutoff;
            })
            .map((s) => s.source)}
          rangeDays={rangeDays}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Buscar por email o nombre…"
                value={search}
                onChange={(e) => setFilter("search", e.target.value)}
              />
            </div>
            <Select value={sourceFilter} onValueChange={(v) => setFilter("sourceFilter", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los orígenes</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getSourceLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
              <Input type="date" value={dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
              <Input type="date" value={dateTo} onChange={(e) => setFilter("dateTo", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      <BulkActionsBar
        count={selection.count}
        onClear={selection.clear}
        onExportCSV={() => exportRows(selection.getSelectedRows(subscribers), "csv")}
        onExportXLSX={() => exportRows(selection.getSelectedRows(subscribers), "xlsx")}
        onDelete={isCeo ? () => setConfirmDeleteOpen(true) : undefined}
        canDelete={isCeo}
        helperText={!isCeo ? "Solo CEO puede eliminar" : undefined}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <SortableTable<Subscriber>
            tableKey="admin_subscribers"
            rows={loading ? [] : filtered}
            rowKey={(r) => r.id}
            emptyMessage={loading ? "Cargando suscriptores…" : "No hay suscriptores con los filtros actuales."}
            selection={{
              isSelected: selection.isSelected,
              toggle: selection.toggle,
              headerState,
              toggleAll: () => selection.toggleAll(filtered),
            }}
            columns={[
              {
                key: "name",
                label: "Nombre",
                defaultWidth: 200,
                accessor: (r) => r.metadata?.name ?? "",
                cell: (r) => (
                  <span className="font-medium">
                    {r.metadata?.name || <span className="text-muted-foreground italic">Sin nombre</span>}
                  </span>
                ),
              },
              {
                key: "email",
                label: "Email",
                defaultWidth: 240,
                cell: (r) => <span className="font-mono text-xs">{r.email}</span>,
              },
              {
                key: "source",
                label: "Origen",
                defaultWidth: 150,
                cell: (r) => (
                  <Badge variant="outline" className="text-xs">
                    {getSourceLabel(r.source)}
                  </Badge>
                ),
              },
              {
                key: "subscribed_at",
                label: "Fecha",
                defaultWidth: 170,
                cell: (r) => (
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(r.subscribed_at), "dd MMM yyyy, HH:mm", { locale: es })}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Estado",
                defaultWidth: 110,
                accessor: (r) => (r.unsubscribed_at ? "desuscrito" : "activo"),
                cell: (r) =>
                  r.unsubscribed_at ? (
                    <Badge variant="destructive" className="text-xs">Desuscrito</Badge>
                  ) : (
                    <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                      Activo
                    </Badge>
                  ),
              },
              {
                key: "last_campaign",
                label: "Última campaña enviada",
                defaultWidth: 240,
                resizable: false,
                accessor: (r) => r.metadata?.last_campaign_at ?? "",
                cell: (r) =>
                  r.metadata?.last_campaign_at ? (
                    <div className="flex flex-col">
                      <span className="font-medium truncate" title={r.metadata.last_campaign_subject}>
                        {r.metadata.last_campaign_subject || "Sin asunto"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.metadata.last_campaign_at), "dd MMM yyyy, HH:mm", { locale: es })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Nunca</span>
                  ),
              } satisfies SortableColumn<Subscriber>,
            ]}
          />
        </CardContent>
      </Card>

      {/* KPI Detail */}
      {kpiModal && (
        <KpiDetailModal<Subscriber>
          open={!!activeKpi}
          onClose={() => setActiveKpi(null)}
          title={kpiModal.title}
          description={kpiModal.description}
          rows={kpiModal.rows}
          rowKey={(r) => r.id}
          columns={kpiColumns}
          onExportCSV={() => {
            const cols = kpiColumnsToExport(kpiColumns);
            downloadCSV(kpiModal.rows, cols, `suscriptores_${activeKpi}_${todayStamp()}`);
          }}
          onExportXLSX={() => {
            const cols = kpiColumnsToExport(kpiColumns);
            downloadXLSX(kpiModal.rows, cols, `suscriptores_${activeKpi}_${todayStamp()}`, "Suscriptores");
          }}
          totalLabel="suscriptores"
        />
      )}

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selection.count}
        itemLabel={{ singular: "suscriptor", plural: "suscriptores" }}
        loading={deleting}
      />
    </div>
  );
}
