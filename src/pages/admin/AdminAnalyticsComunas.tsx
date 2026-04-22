/**
 * Página completa de analítica por comuna.
 * - Ranking de tráfico
 * - Desglose de conversiones por tipo
 * - Tendencia de pageviews 30 días
 * - Filtros por rango y búsqueda
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { ArrowUpDown, ExternalLink, Search, MapPin, Phone, MessageCircle, FileText, ArrowRightLeft } from "lucide-react";
import KpiCard from "@/components/admin/KpiCard";
import KpiDetailModal, { type KpiDetailColumn } from "@/components/admin/KpiDetailModal";
import { downloadCSV, downloadXLSX, todayStamp } from "@/lib/admin-export";
import { useToast } from "@/hooks/use-toast";

type Range = 7 | 30 | 90;

interface ComunaRow {
  slug: string;
  nombre: string;
  views: number;
  uniqueSessions: number;
  callClicks: number;
  whatsappClicks: number;
  planesClicks: number;
  vecinaClicks: number;
  totalConversions: number;
  ctr: number;
}

const EVENT_LABELS: Record<string, string> = {
  cta_call: "Llamar",
  cta_whatsapp: "WhatsApp",
  view_planes: "Ver planes",
  navigate_vecina: "Comuna vecina",
};

export default function AdminAnalyticsComunas() {
  const [range, setRange] = useState<Range>(30);
  const [pageViews, setPageViews] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof ComunaRow>("views");
  const [activeKpi, setActiveKpi] = useState<null | "views" | "conv" | "ctr" | "comunas">(null);
  const { toast } = useToast();
    const load = async () => {
      setLoading(true);
      const since = subDays(new Date(), range).toISOString();
      const [pvRes, cvRes] = await Promise.all([
        (supabase.from as any)("comuna_page_views")
          .select("comuna_slug, comuna_nombre, session_id, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20000),
        (supabase.from as any)("comuna_conversion_events")
          .select("comuna_slug, comuna_nombre, event_type, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20000),
      ]);
      setPageViews(pvRes.data ?? []);
      setConversions(cvRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [range]);

  // Agregaciones por comuna
  const rows: ComunaRow[] = useMemo(() => {
    const byComuna = new Map<string, ComunaRow>();
    pageViews.forEach((v) => {
      const slug = v.comuna_slug;
      let r = byComuna.get(slug);
      if (!r) {
        r = {
          slug,
          nombre: v.comuna_nombre ?? slug,
          views: 0,
          uniqueSessions: 0,
          callClicks: 0,
          whatsappClicks: 0,
          planesClicks: 0,
          vecinaClicks: 0,
          totalConversions: 0,
          ctr: 0,
        };
        byComuna.set(slug, r);
      }
      r.views++;
    });
    // sesiones únicas
    const sessionSets = new Map<string, Set<string>>();
    pageViews.forEach((v) => {
      if (!v.session_id) return;
      const set = sessionSets.get(v.comuna_slug) ?? new Set<string>();
      set.add(v.session_id);
      sessionSets.set(v.comuna_slug, set);
    });
    sessionSets.forEach((set, slug) => {
      const r = byComuna.get(slug);
      if (r) r.uniqueSessions = set.size;
    });
    // conversiones
    conversions.forEach((c) => {
      const r = byComuna.get(c.comuna_slug);
      if (!r) return;
      r.totalConversions++;
      if (c.event_type === "cta_call") r.callClicks++;
      else if (c.event_type === "cta_whatsapp") r.whatsappClicks++;
      else if (c.event_type === "view_planes") r.planesClicks++;
      else if (c.event_type === "navigate_vecina") r.vecinaClicks++;
    });
    byComuna.forEach((r) => {
      r.ctr = r.views > 0 ? (r.totalConversions / r.views) * 100 : 0;
    });
    return Array.from(byComuna.values());
  }, [pageViews, conversions]);

  const filteredSorted = useMemo(() => {
    const filtered = search
      ? rows.filter((r) => r.nombre.toLowerCase().includes(search.toLowerCase()))
      : rows;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return bv - av;
      return String(bv).localeCompare(String(av));
    });
  }, [rows, search, sortKey]);

  // Tendencia diaria de pageviews
  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), range - 1), end: new Date() });
    const counts = new Map<string, number>();
    pageViews.forEach((v) => {
      const k = format(new Date(v.created_at), "yyyy-MM-dd");
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    return days.map((d) => {
      const k = format(d, "yyyy-MM-dd");
      return { date: format(d, "dd MMM", { locale: es }), views: counts.get(k) ?? 0 };
    });
  }, [pageViews, range]);

  // Distribución por tipo de evento
  const eventDistribution = useMemo(() => {
    const m = new Map<string, number>();
    conversions.forEach((c) => m.set(c.event_type, (m.get(c.event_type) ?? 0) + 1));
    return Array.from(m.entries()).map(([k, v]) => ({
      name: EVENT_LABELS[k] ?? k,
      value: v,
    }));
  }, [conversions]);

  const totalViews = rows.reduce((s, r) => s + r.views, 0);
  const totalConv = rows.reduce((s, r) => s + r.totalConversions, 0);
  const overallCtr = totalViews > 0 ? (totalConv / totalViews) * 100 : 0;
  const activeComunas = rows.length;

  const kpis = [
    { label: "Pageviews", value: totalViews.toLocaleString("es-CL"), icon: MapPin, color: "text-blue-500" },
    { label: "Conversiones", value: totalConv.toLocaleString("es-CL"), icon: ArrowRightLeft, color: "text-emerald-500" },
    { label: "CTR Global", value: `${overallCtr.toFixed(1)}%`, icon: Phone, color: "text-purple-500" },
    { label: "Comunas activas", value: `${activeComunas}/52`, icon: FileText, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Analítica por Comuna</h1>
          <p className="text-sm text-muted-foreground">
            Rendimiento de las landing pages hiperlocales de la Región Metropolitana.
          </p>
        </div>
        <div className="flex gap-1">
          {([7, 30, 90] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
              className="text-xs h-8 px-3"
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <k.icon className={`w-5 h-5 ${k.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold leading-none">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tendencia de pageviews</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversiones por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={eventDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla ranking */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm">Ranking por comuna</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar comuna…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-muted/40 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Sin resultados para tu búsqueda." : "Aún no hay tráfico registrado en las landing pages de comuna."}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-3">#</th>
                    <th className="text-left py-2 px-3">Comuna</th>
                    <SortHeader label="Views" k="views" sortKey={sortKey} onClick={setSortKey} />
                    <SortHeader label="Sesiones" k="uniqueSessions" sortKey={sortKey} onClick={setSortKey} />
                    <th className="text-right py-2 px-3">
                      <Phone className="w-3 h-3 inline" /> Call
                    </th>
                    <th className="text-right py-2 px-3">
                      <MessageCircle className="w-3 h-3 inline" /> WA
                    </th>
                    <th className="text-right py-2 px-3">Planes</th>
                    <th className="text-right py-2 px-3">Vecina</th>
                    <SortHeader label="CTR" k="ctr" sortKey={sortKey} onClick={setSortKey} />
                    <th className="text-right py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSorted.map((r, i) => (
                    <tr key={r.slug} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="py-2 px-3 font-medium">{r.nombre}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">{r.views}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{r.uniqueSessions}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.callClicks}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.whatsappClicks}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.planesClicks}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.vecinaClicks}</td>
                      <td className="py-2 px-3 text-right">
                        <Badge variant={r.ctr >= 5 ? "default" : "outline"} className="text-[10px] tabular-nums">
                          {r.ctr.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Link
                          to={`/funeraria/${r.slug}`}
                          target="_blank"
                          rel="noopener"
                          className="text-muted-foreground hover:text-primary inline-flex"
                          title="Abrir landing"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SortHeader({
  label,
  k,
  sortKey,
  onClick,
}: {
  label: string;
  k: keyof ComunaRow;
  sortKey: keyof ComunaRow;
  onClick: (k: keyof ComunaRow) => void;
}) {
  const active = sortKey === k;
  return (
    <th
      className={`text-right py-2 px-3 cursor-pointer select-none ${active ? "text-primary" : ""}`}
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label} <ArrowUpDown className="w-3 h-3 opacity-60" />
      </span>
    </th>
  );
}
