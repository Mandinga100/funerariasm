import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortableTable, type SortableColumn } from "@/components/admin/SortableTable";
import { useToast } from "@/hooks/use-toast";
import { Download, Mail, Search, Users, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SubscribersTrendChart } from "@/components/admin/SubscribersTrendChart";
import { SubscribersSourceChart } from "@/components/admin/SubscribersSourceChart";
import { getSourceLabel } from "@/lib/subscription-source";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { usePagination } from "@/hooks/use-pagination";
import { usePersistentFilters } from "@/hooks/use-persistent-filters";

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

export default function AdminSubscribers() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const { filters, setFilter, hydrated: filtersHydrated } = usePersistentFilters("admin_subscribers", {
    search: "",
    sourceFilter: "all",
    dateFrom: "",
    dateTo: "",
    rangeDays: 30,
  });
  const { search, sourceFilter, dateFrom, dateTo, rangeDays } = filters;

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
    const active = subscribers.filter((s) => !s.unsubscribed_at).length;
    const thisMonth = subscribers.filter((s) => {
      const d = new Date(s.subscribed_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total: subscribers.length, active, thisMonth };
  }, [subscribers]);

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast({ title: "Sin datos", description: "No hay suscriptores para exportar con los filtros actuales." });
      return;
    }
    const headers = ["Email", "Nombre", "Origen", "Fecha de suscripción", "Estado", "Última campaña", "Fecha última campaña"];
    const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((s) =>
      [
        escape(s.email),
        escape(s.metadata?.name ?? ""),
        escape(s.source ?? ""),
        escape(format(new Date(s.subscribed_at), "yyyy-MM-dd HH:mm")),
        escape(s.unsubscribed_at ? "Desuscrito" : "Activo"),
        escape(s.metadata?.last_campaign_subject ?? ""),
        escape(s.metadata?.last_campaign_at ? format(new Date(s.metadata.last_campaign_at), "yyyy-MM-dd HH:mm") : ""),
      ].join(",")
    );
    const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suscriptores-blog-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exportación completada", description: `${filtered.length} suscriptores exportados.` });
  };

  const clearFilters = () => {
    setSearch("");
    setSourceFilter("all");
    setDateFrom("");
    setDateTo("");
  };

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
          <Button size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV ({filtered.length})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Activos</p>
                <p className="text-2xl font-semibold text-primary">{stats.active}</p>
              </div>
              <Mail className="w-8 h-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Este mes</p>
                <p className="text-2xl font-semibold">{stats.thisMonth}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SubscribersTrendChart
          subscribedDates={subscribers.map((s) => s.subscribed_at)}
          days={rangeDays}
          onRangeChange={setRangeDays}
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
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input
                placeholder="Buscar por email o nombre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
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
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <SortableTable<Subscriber>
            tableKey="admin_subscribers"
            rows={loading ? [] : filtered}
            rowKey={(r) => r.id}
            emptyMessage={loading ? "Cargando suscriptores…" : "No hay suscriptores con los filtros actuales."}
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
                  <Badge variant="outline" className="text-xs border-gold/40 text-foreground bg-gold/5">
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
    </div>
  );
}
