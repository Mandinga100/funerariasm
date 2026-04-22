/**
 * Ranking de ROI real por landing de comuna.
 * Lee revenue_attribution (poblada automáticamente cuando un caso pasa
 * a contratado/cerrado y el lead trae atribución de comuna).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowUpDown, ExternalLink, Search, Trophy, DollarSign, Target, MapPin } from "lucide-react";
import { subDays } from "date-fns";
import KpiCard from "@/components/admin/KpiCard";
import KpiDetailModal, { type KpiDetailColumn } from "@/components/admin/KpiDetailModal";
import { downloadCSV, downloadXLSX, todayStamp } from "@/lib/admin-export";
import { useToast } from "@/hooks/use-toast";

type Range = 30 | 90 | 365 | 0; // 0 = all-time

interface RevenueRow {
  slug: string;
  nombre: string;
  totalRevenue: number;
  cases: number;
  views: number;
  leads: number;
  avgTicket: number;
  conversionRate: number; // leads / views
  closeRate: number;       // cases / leads
  roi: number;             // totalRevenue / max(views,1)
}

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export default function AdminRevenueComunas() {
  const [range, setRange] = useState<Range>(90);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [pageViews, setPageViews] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof RevenueRow>("totalRevenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeKpi, setActiveKpi] = useState<null | "revenue" | "cases" | "leads" | "comunas">(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = range === 0 ? null : subDays(new Date(), range).toISOString();

      const revQ = (supabase.from as any)("revenue_attribution").select("*").order("recorded_at", { ascending: false });
      if (since) revQ.gte("recorded_at", since);

      const pvQ = (supabase.from as any)("comuna_page_views").select("comuna_slug, comuna_nombre, session_id");
      if (since) pvQ.gte("created_at", since);

      const leadsQ = supabase.from("contact_leads").select("id, metadata, created_at");
      if (since) leadsQ.gte("created_at", since);

      const [revRes, pvRes, leadsRes] = await Promise.all([revQ, pvQ, leadsQ]);
      if (cancelled) return;

      setRevenue(revRes.data ?? []);
      setPageViews(pvRes.data ?? []);
      setLeads(leadsRes.data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [range]);

  const rows = useMemo<RevenueRow[]>(() => {
    const map = new Map<string, RevenueRow>();

    // Seed from revenue
    revenue.forEach((r: any) => {
      const existing = map.get(r.comuna_slug) ?? {
        slug: r.comuna_slug,
        nombre: r.comuna_nombre ?? r.comuna_slug,
        totalRevenue: 0, cases: 0, views: 0, leads: 0,
        avgTicket: 0, conversionRate: 0, closeRate: 0, roi: 0,
      };
      existing.totalRevenue += r.amount ?? 0;
      existing.cases += 1;
      if (r.comuna_nombre && !existing.nombre) existing.nombre = r.comuna_nombre;
      map.set(r.comuna_slug, existing);
    });

    // Add views
    const viewsBySlug = new Map<string, number>();
    pageViews.forEach((v: any) => {
      viewsBySlug.set(v.comuna_slug, (viewsBySlug.get(v.comuna_slug) ?? 0) + 1);
    });
    viewsBySlug.forEach((count, slug) => {
      const row = map.get(slug);
      if (row) row.views = count;
      else {
        const sample = pageViews.find((v: any) => v.comuna_slug === slug);
        map.set(slug, {
          slug, nombre: sample?.comuna_nombre ?? slug,
          totalRevenue: 0, cases: 0, views: count, leads: 0,
          avgTicket: 0, conversionRate: 0, closeRate: 0, roi: 0,
        });
      }
    });

    // Add leads with attribution
    leads.forEach((l: any) => {
      const attr = l.metadata?.comuna_attribution;
      if (!attr?.comuna_slug) return;
      const row = map.get(attr.comuna_slug);
      if (row) row.leads += 1;
      else {
        map.set(attr.comuna_slug, {
          slug: attr.comuna_slug, nombre: attr.comuna_nombre ?? attr.comuna_slug,
          totalRevenue: 0, cases: 0, views: 0, leads: 1,
          avgTicket: 0, conversionRate: 0, closeRate: 0, roi: 0,
        });
      }
    });

    // Compute derived metrics
    const list = Array.from(map.values()).map(r => ({
      ...r,
      avgTicket: r.cases > 0 ? Math.round(r.totalRevenue / r.cases) : 0,
      conversionRate: r.views > 0 ? (r.leads / r.views) * 100 : 0,
      closeRate: r.leads > 0 ? (r.cases / r.leads) * 100 : 0,
      roi: r.views > 0 ? Math.round(r.totalRevenue / r.views) : 0,
    }));

    return list.filter(r =>
      !search || r.nombre.toLowerCase().includes(search.toLowerCase()) || r.slug.includes(search.toLowerCase())
    );
  }, [revenue, pageViews, leads, search]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(() => ({
    revenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
    cases: rows.reduce((s, r) => s + r.cases, 0),
    leads: rows.reduce((s, r) => s + r.leads, 0),
    activeComunas: rows.filter(r => r.totalRevenue > 0).length,
  }), [rows]);

  const top10 = useMemo(() => sorted.slice(0, 10).map(r => ({
    name: r.nombre,
    Ingresos: r.totalRevenue,
  })).filter(r => r.Ingresos > 0), [sorted]);

  const toggleSort = (k: keyof RevenueRow) => {
    if (sortKey === k) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" /> ROI por Comuna
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingresos reales generados por cada landing de comuna (atribución desde landing → lead → caso contratado).
          </p>
        </div>
        <div className="flex gap-2">
          {([30, 90, 365, 0] as Range[]).map(r => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
            >
              {r === 0 ? "Todo" : `${r}d`}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><DollarSign className="w-3 h-3" />Ingresos atribuidos</div>
          <div className="text-2xl font-semibold">{fmtCLP(totals.revenue)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Target className="w-3 h-3" />Casos contratados</div>
          <div className="text-2xl font-semibold">{totals.cases}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Search className="w-3 h-3" />Leads atribuidos</div>
          <div className="text-2xl font-semibold">{totals.leads}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><MapPin className="w-3 h-3" />Comunas con ingresos</div>
          <div className="text-2xl font-semibold">{totals.activeComunas}</div>
        </CardContent></Card>
      </div>

      {/* Top 10 chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 comunas por ingresos</CardTitle></CardHeader>
        <CardContent>
          {top10.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aún no hay ingresos atribuidos en este rango. Cuando un caso con atribución de comuna pase a "contratado", aparecerá aquí.
            </p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmtCLP(v)} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="Ingresos" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Ranking detallado</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Buscar comuna..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin datos en este rango.</p>
          ) : (
            <table className="w-full text-sm min-w-[820px]">
              <thead className="border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Comuna</th>
                  <Th label="Ingresos" k="totalRevenue" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Casos" k="cases" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Ticket prom." k="avgTicket" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Views" k="views" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Leads" k="leads" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Conv. %" k="conversionRate" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Cierre %" k="closeRate" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="$ / view" k="roi" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.slug} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-3 font-medium">{r.nombre}</td>
                    <td className="py-2 pr-3 font-semibold text-gold">{r.totalRevenue > 0 ? fmtCLP(r.totalRevenue) : "—"}</td>
                    <td className="py-2 pr-3">{r.cases || "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.avgTicket > 0 ? fmtCLP(r.avgTicket) : "—"}</td>
                    <td className="py-2 pr-3">{r.views || "—"}</td>
                    <td className="py-2 pr-3">{r.leads || "—"}</td>
                    <td className="py-2 pr-3">
                      {r.conversionRate > 0
                        ? <Badge variant={r.conversionRate >= 5 ? "default" : "secondary"} className="text-[10px]">{r.conversionRate.toFixed(1)}%</Badge>
                        : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {r.closeRate > 0
                        ? <Badge variant={r.closeRate >= 30 ? "default" : "secondary"} className="text-[10px]">{r.closeRate.toFixed(0)}%</Badge>
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.roi > 0 ? fmtCLP(r.roi) : "—"}</td>
                    <td className="py-2">
                      <Link to={`/funeraria/${r.slug}`} target="_blank" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, onClick }: {
  label: string; k: keyof RevenueRow; sortKey: keyof RevenueRow; sortDir: "asc" | "desc"; onClick: (k: keyof RevenueRow) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="py-2 pr-3">
      <button onClick={() => onClick(k)} className={`flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground" : ""}`}>
        {label}<ArrowUpDown className="w-3 h-3 opacity-60" />
        {active && <span className="text-[10px]">{sortDir === "desc" ? "↓" : "↑"}</span>}
      </button>
    </th>
  );
}
