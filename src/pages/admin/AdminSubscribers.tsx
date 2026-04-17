import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Mail, Search, Users, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SubscribersTrendChart } from "@/components/admin/SubscribersTrendChart";
import { SubscribersSourceChart } from "@/components/admin/SubscribersSourceChart";

interface Subscriber {
  id: string;
  email: string;
  source: string | null;
  metadata: { name?: string } | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export default function AdminSubscribers() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

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
    const headers = ["Email", "Nombre", "Origen", "Fecha de suscripción", "Estado"];
    const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((s) =>
      [
        escape(s.email),
        escape(s.metadata?.name ?? ""),
        escape(s.source ?? ""),
        escape(format(new Date(s.subscribed_at), "yyyy-MM-dd HH:mm")),
        escape(s.unsubscribed_at ? "Desuscrito" : "Activo"),
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
        <SubscribersTrendChart subscribedDates={subscribers.map((s) => s.subscribed_at)} days={30} />
        <SubscribersSourceChart sources={subscribers.map((s) => s.source)} />
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
                    {s}
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      Cargando suscriptores…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      No hay suscriptores con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.metadata?.name || <span className="text-muted-foreground italic">Sin nombre</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {s.source || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(s.subscribed_at), "dd MMM yyyy, HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {s.unsubscribed_at ? (
                          <Badge variant="destructive" className="text-xs">Desuscrito</Badge>
                        ) : (
                          <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                            Activo
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
