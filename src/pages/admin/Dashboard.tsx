import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Heart, Users, MessageSquare, DollarSign, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";

interface Stats {
  obituaries: number;
  memorials: number;
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  condolences: number;
  pendingPayments: number;
  totalRevenue: number;
  overdueLeads: number;
}

interface LeadByStage {
  stage: string;
  count: number;
}

interface LeadByDay {
  date: string;
  count: number;
}

const PIPELINE_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  cotizado: "Cotizado",
  contratado: "Contratado",
  cerrado: "Cerrado",
};

const URGENCY_COLORS: Record<string, string> = {
  inmediata: "#ef4444",
  normal: "#3b82f6",
  previsión: "#22c55e",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    obituaries: 0, memorials: 0, totalLeads: 0, newLeads: 0,
    contactedLeads: 0, condolences: 0, pendingPayments: 0,
    totalRevenue: 0, overdueLeads: 0,
  });
  const [pipelineData, setPipelineData] = useState<LeadByStage[]>([]);
  const [leadsTimeline, setLeadsTimeline] = useState<LeadByDay[]>([]);
  const [urgencyData, setUrgencyData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [o, m, leads, c, payments] = await Promise.all([
        supabase.from("obituaries").select("id", { count: "exact", head: true }),
        supabase.from("memorials").select("id", { count: "exact", head: true }),
        supabase.from("contact_leads").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("condolences").select("id", { count: "exact", head: true }),
        supabase.from("payment_transactions").select("amount, status"),
      ]);

      const allLeads = leads.data ?? [];
      const allPayments = payments.data ?? [];

      // Stats
      const newLeads = allLeads.filter(l => (l.pipeline_stage ?? "nuevo") === "nuevo").length;
      const contactedLeads = allLeads.filter(l => l.pipeline_stage === "contactado").length;
      const pendingPayments = allPayments.filter(p => ["initiated", "pending_verification"].includes(p.status)).length;
      const totalRevenue = allPayments.filter(p => p.status === "verified").reduce((s, p) => s + (p.amount || 0), 0);

      // Overdue leads (new + no contact in 2h for urgent, 24h for normal)
      const now = new Date();
      const overdueLeads = allLeads.filter(l => {
        if ((l.pipeline_stage ?? "nuevo") !== "nuevo") return false;
        const created = new Date(l.created_at);
        const hours = differenceInHours(now, created);
        if (l.urgency === "inmediata") return hours >= 2;
        if (l.urgency === "normal") return hours >= 24;
        return hours >= 72;
      }).length;

      setStats({
        obituaries: o.count ?? 0,
        memorials: m.count ?? 0,
        totalLeads: allLeads.length,
        newLeads,
        contactedLeads,
        condolences: c.count ?? 0,
        pendingPayments,
        totalRevenue,
        overdueLeads,
      });

      // Pipeline chart
      const stages = ["nuevo", "contactado", "cotizado", "contratado", "cerrado"];
      setPipelineData(stages.map(stage => ({
        stage: PIPELINE_LABELS[stage] || stage,
        count: allLeads.filter(l => (l.pipeline_stage ?? "nuevo") === stage).length,
      })));

      // Leads timeline (last 14 days)
      const timeline: LeadByDay[] = [];
      for (let i = 13; i >= 0; i--) {
        const day = subDays(now, i);
        const dayStr = format(day, "yyyy-MM-dd");
        const label = format(day, "dd MMM", { locale: es });
        const count = allLeads.filter(l => l.created_at.startsWith(dayStr)).length;
        timeline.push({ date: label, count });
      }
      setLeadsTimeline(timeline);

      // Urgency distribution
      const urgencyCounts: Record<string, number> = {};
      allLeads.forEach(l => {
        const u = l.urgency ?? "normal";
        urgencyCounts[u] = (urgencyCounts[u] || 0) + 1;
      });
      setUrgencyData(Object.entries(urgencyCounts).map(([name, value]) => ({
        name, value, color: URGENCY_COLORS[name] || "#94a3b8",
      })));

      // Recent leads
      setRecentLeads(allLeads.slice(0, 5));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const kpis = [
    { label: "Leads Nuevos", value: stats.newLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Leads Vencidos", value: stats.overdueLeads, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Pagos Pendientes", value: stats.pendingPayments, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Ingresos Verificados", value: `$${(stats.totalRevenue).toLocaleString("es-CL")}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { label: "Obituarios", value: stats.obituaries, icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Memoriales", value: stats.memorials, icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Total Leads", value: stats.totalLeads, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Condolencias", value: stats.condolences, icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel CRM</h1>
        {stats.overdueLeads > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            ⚠️ {stats.overdueLeads} lead{stats.overdueLeads > 1 ? "s" : ""} sin contactar
          </Badge>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", k.bg)}>
                  <k.icon className={cn("w-5 h-5", k.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipelineData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads Timeline */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leads Últimos 14 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={leadsTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Urgency Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribución por Urgencia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={urgencyData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                  {urgencyData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Leads Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLeads.map(lead => {
              const hours = differenceInHours(new Date(), new Date(lead.created_at));
              const isOverdue = lead.urgency === "inmediata" ? hours >= 2 : hours >= 24;
              return (
                <div key={lead.id} className={cn("flex items-center justify-between p-3 rounded-lg border", isOverdue && (lead.pipeline_stage ?? "nuevo") === "nuevo" && "border-red-300 bg-red-50")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", lead.urgency === "inmediata" ? "bg-red-500" : lead.urgency === "previsión" ? "bg-green-500" : "bg-blue-500")} />
                    <div>
                      <p className="font-medium text-sm">{lead.name ?? "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone ?? lead.email ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{PIPELINE_LABELS[lead.pipeline_stage ?? "nuevo"] ?? "Nuevo"}</Badge>
                    <span className="text-xs text-muted-foreground">hace {hours}h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
