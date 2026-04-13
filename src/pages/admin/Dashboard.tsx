import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpen, Heart, Users, MessageSquare, DollarSign, Clock, TrendingUp, AlertTriangle, ArrowRight, CalendarDays, Percent, Timer, Banknote, FileDown, Loader2, CalendarIcon, RotateCcw, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend } from "recharts";
import { format, subDays, subMonths, differenceInHours, differenceInMinutes, startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

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
  conversionRate: number;
  avgDealValue: number;
  avgResponseTimeMin: number;
}

interface LeadByStage {
  stage: string;
  stageId: string;
  count: number;
}

interface LeadByDay {
  date: string;
  count: number;
}

interface MonthlyData {
  month: string;
  leads: number;
  converted: number;
  revenue: number;
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
  immediate: "#ef4444",
  normal: "#3b82f6",
  "previsión": "#22c55e",
};

const URGENCY_LABELS: Record<string, string> = {
  inmediata: "Urgente",
  immediate: "Urgente",
  normal: "Normal",
  "previsión": "Previsión",
};

function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<Stats>({
    obituaries: 0, memorials: 0, totalLeads: 0, newLeads: 0,
    contactedLeads: 0, condolences: 0, pendingPayments: 0,
    totalRevenue: 0, overdueLeads: 0, conversionRate: 0,
    avgDealValue: 0, avgResponseTimeMin: 0,
  });
  const [pipelineData, setPipelineData] = useState<LeadByStage[]>([]);
  const [leadsTimeline, setLeadsTimeline] = useState<LeadByDay[]>([]);
  const [urgencyData, setUrgencyData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [conversionTrend, setConversionTrend] = useState<{ month: string; rate: number }[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  const generateAiSummary = async () => {
    setAiLoading(true);
    setAiSummary("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-executive-summary", {
        body: {
          stats,
          monthlyData,
          pipelineData,
          urgencyData,
          dateRange: {
            from: dateFrom ? format(dateFrom, "dd/MM/yyyy") : null,
            to: dateTo ? format(dateTo, "dd/MM/yyyy") : null,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiSummary(data.summary);
      toast.success("Resumen ejecutivo generado");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al generar resumen");
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgW = canvas.width;
      const imgH = canvas.height;

      const pdf = new jsPDF({ orientation: imgW > imgH ? "l" : "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const scaledH = (imgH * usableW) / imgW;

      // Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Funeraria Santa Margarita — Reporte de Analíticas", margin, 12);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, margin, 18);
      pdf.line(margin, 20, pageW - margin, 20);

      const startY = 24;
      const availH = pageH - startY - margin;

      if (scaledH <= availH) {
        pdf.addImage(imgData, "JPEG", margin, startY, usableW, scaledH);
      } else {
        // Multi-page
        let srcY = 0;
        let page = 0;
        while (srcY < imgH) {
          const sliceH = Math.min(imgH - srcY, (availH * imgW) / usableW);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = imgW;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, srcY, imgW, sliceH, 0, 0, imgW, sliceH);

          const sliceImg = sliceCanvas.toDataURL("image/jpeg", 0.95);
          const sliceRenderedH = (sliceH * usableW) / imgW;

          if (page > 0) pdf.addPage();
          pdf.addImage(sliceImg, "JPEG", margin, page === 0 ? startY : margin, usableW, sliceRenderedH);
          srcY += sliceH;
          page++;
        }
      }

      pdf.save(`reporte-analiticas-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Reporte PDF descargado exitosamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el PDF");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const [o, m, leads, c, payments, activities] = await Promise.all([
        supabase.from("obituaries").select("id", { count: "exact", head: true }),
        supabase.from("memorials").select("id", { count: "exact", head: true }),
        supabase.from("contact_leads").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("condolences").select("id", { count: "exact", head: true }),
        supabase.from("payment_transactions").select("amount, status, created_at"),
        supabase.from("lead_activities").select("lead_id, created_at, activity_type").eq("activity_type", "pipeline_change").order("created_at", { ascending: true }).limit(1000),
      ]);

      const rangeStart = dateFrom ? startOfDay(dateFrom) : undefined;
      const rangeEnd = dateTo ? endOfDay(dateTo) : undefined;

      const filterByRange = (dateStr: string) => {
        if (!rangeStart && !rangeEnd) return true;
        const d = new Date(dateStr);
        if (rangeStart && d < rangeStart) return false;
        if (rangeEnd && d > rangeEnd) return false;
        return true;
      };

      const allLeads = (leads.data ?? []).filter(l => filterByRange(l.created_at));
      const allPayments = (payments.data ?? []).filter(p => filterByRange(p.created_at));
      const allActivities = activities.data ?? [];

      const newLeads = allLeads.filter(l => (l.pipeline_stage ?? "nuevo") === "nuevo").length;
      const contactedLeads = allLeads.filter(l => l.pipeline_stage === "contactado").length;
      const pendingPayments = allPayments.filter(p => ["initiated", "pending_verification"].includes(p.status)).length;
      const verifiedPayments = allPayments.filter(p => p.status === "verified");
      const totalRevenue = verifiedPayments.reduce((s, p) => s + (p.amount || 0), 0);

      // Conversion rate: leads that reached "contratado" or "cerrado"
      const convertedLeads = allLeads.filter(l => ["contratado", "cerrado"].includes(l.pipeline_stage ?? ""));
      const conversionRate = allLeads.length > 0 ? (convertedLeads.length / allLeads.length) * 100 : 0;

      // Average deal value
      const avgDealValue = verifiedPayments.length > 0 ? totalRevenue / verifiedPayments.length : 0;

      // Average response time: time from lead creation to first activity
      const firstActivityByLead: Record<string, string> = {};
      allActivities.forEach(a => {
        if (!firstActivityByLead[a.lead_id]) {
          firstActivityByLead[a.lead_id] = a.created_at;
        }
      });
      const responseTimes: number[] = [];
      allLeads.forEach(l => {
        const firstActivity = firstActivityByLead[l.id];
        if (firstActivity) {
          const mins = differenceInMinutes(new Date(firstActivity), new Date(l.created_at));
          if (mins >= 0 && mins < 10080) responseTimes.push(mins); // max 1 week
        }
      });
      const avgResponseTimeMin = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

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
        conversionRate,
        avgDealValue,
        avgResponseTimeMin,
      });

      const stages = ["nuevo", "contactado", "cotizado", "contratado", "cerrado"];
      setPipelineData(stages.map(stage => ({
        stage: PIPELINE_LABELS[stage] || stage,
        stageId: stage,
        count: allLeads.filter(l => (l.pipeline_stage ?? "nuevo") === stage).length,
      })));

      const timeline: LeadByDay[] = [];
      for (let i = 13; i >= 0; i--) {
        const day = subDays(now, i);
        const dayStr = format(day, "yyyy-MM-dd");
        const label = format(day, "dd MMM", { locale: es });
        const count = allLeads.filter(l => l.created_at.startsWith(dayStr)).length;
        timeline.push({ date: label, count });
      }
      setLeadsTimeline(timeline);

      // Monthly data (last 6 months)
      const monthly: MonthlyData[] = [];
      const convTrend: { month: string; rate: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, "MMM yy", { locale: es });

        const monthLeads = allLeads.filter(l => {
          const d = new Date(l.created_at);
          return d >= monthStart && d <= monthEnd;
        });
        const monthConverted = monthLeads.filter(l => ["contratado", "cerrado"].includes(l.pipeline_stage ?? ""));
        const monthRevenue = allPayments
          .filter(p => p.status === "verified" && new Date(p.created_at) >= monthStart && new Date(p.created_at) <= monthEnd)
          .reduce((s, p) => s + (p.amount || 0), 0);

        monthly.push({
          month: monthLabel,
          leads: monthLeads.length,
          converted: monthConverted.length,
          revenue: monthRevenue,
        });
        convTrend.push({
          month: monthLabel,
          rate: monthLeads.length > 0 ? Math.round((monthConverted.length / monthLeads.length) * 100) : 0,
        });
      }
      setMonthlyData(monthly);
      setConversionTrend(convTrend);

      const urgencyCounts: Record<string, number> = {};
      allLeads.forEach(l => {
        const u = l.urgency ?? "normal";
        urgencyCounts[u] = (urgencyCounts[u] || 0) + 1;
      });
      setUrgencyData(Object.entries(urgencyCounts).map(([name, value]) => ({
        name, value, color: URGENCY_COLORS[name] || "#94a3b8",
      })));

      setRecentLeads(allLeads.slice(0, 5));
      setLoading(false);
    };
    load();
  }, [dateFrom, dateTo]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const kpis = [
    { label: "Leads Nuevos", value: stats.newLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50", link: "/admin/leads?stage=nuevo" },
    { label: "Leads Vencidos", value: stats.overdueLeads, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", link: "/admin/leads?filter=overdue" },
    { label: "Pagos Pendientes", value: stats.pendingPayments, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", link: "/admin/pagos?status=pending" },
    { label: "Ingresos Verificados", value: `$${(stats.totalRevenue).toLocaleString("es-CL")}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50", link: "/admin/pagos?status=confirmed" },
    { label: "Tasa Conversión", value: `${stats.conversionRate.toFixed(1)}%`, icon: Percent, color: "text-purple-600", bg: "bg-purple-50", link: "/admin/leads" },
    { label: "Valor Promedio", value: `$${Math.round(stats.avgDealValue).toLocaleString("es-CL")}`, icon: Banknote, color: "text-teal-600", bg: "bg-teal-50", link: "/admin/pagos" },
    { label: "Tiempo Respuesta", value: formatMinutes(stats.avgResponseTimeMin), icon: Timer, color: "text-orange-600", bg: "bg-orange-50", link: "/admin/leads" },
    { label: "Total Leads", value: stats.totalLeads, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50", link: "/admin/leads" },
  ];

  const secondaryKpis = [
    { label: "Obituarios", value: stats.obituaries, icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50", link: "/admin/obituarios" },
    { label: "Legados", value: stats.memorials, icon: Heart, color: "text-rose-600", bg: "bg-rose-50", link: "/admin/memoriales" },
    { label: "Condolencias", value: stats.condolences, icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50", link: "/admin/memoriales" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Panel de Analíticas</h1>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {stats.overdueLeads > 0 && (
            <Badge
              variant="destructive"
              className="animate-pulse cursor-pointer"
              onClick={() => navigate("/admin/leads?filter=overdue")}
            >
              ⚠️ {stats.overdueLeads} lead{stats.overdueLeads > 1 ? "s" : ""} sin contactar
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs sm:text-sm", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Desde"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" disabled={(d) => dateTo ? d > dateTo : false} />
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground">—</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs sm:text-sm", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Hasta"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" disabled={(d) => dateFrom ? d < dateFrom : false} />
          </PopoverContent>
        </Popover>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="text-xs h-8 px-2" onClick={() => { setDateFrom(subDays(new Date(), 7)); setDateTo(new Date()); }}>7d</Button>
          <Button size="sm" variant="ghost" className="text-xs h-8 px-2" onClick={() => { setDateFrom(subDays(new Date(), 30)); setDateTo(new Date()); }}>30d</Button>
          <Button size="sm" variant="ghost" className="text-xs h-8 px-2" onClick={() => { setDateFrom(subDays(new Date(), 90)); setDateTo(new Date()); }}>90d</Button>
        </div>
        {(dateFrom || dateTo) && (
          <Button size="sm" variant="ghost" className="text-xs h-8 px-2 text-muted-foreground" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
            <RotateCcw className="w-3 h-3 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      {/* AI Executive Summary */}
      <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Resumen Ejecutivo IA
          </CardTitle>
          <Button
            size="sm"
            variant={aiSummary ? "ghost" : "default"}
            onClick={generateAiSummary}
            disabled={aiLoading}
            className="text-xs"
          >
            {aiLoading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Analizando...</>
            ) : aiSummary ? (
              <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerar</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 mr-1" /> Generar Insights</>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {aiSummary ? (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground">
              <ReactMarkdown>{aiSummary}</ReactMarkdown>
            </div>
          ) : !aiLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Haz clic en "Generar Insights" para obtener un análisis ejecutivo del período seleccionado con recomendaciones accionables.
            </p>
          ) : (
            <div className="space-y-2 py-4">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-full" />
              <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
              <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            </div>
          )}
        </CardContent>
      </Card>

      <div ref={dashboardRef} className="space-y-4 sm:space-y-6">

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map(k => (
          <Card
            key={k.label}
            className="hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate(k.link)}
          >
            <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn("p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0", k.bg)}>
                  <k.icon className={cn("w-4 h-4 sm:w-5 sm:h-5", k.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-2xl font-bold leading-none truncate">{k.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{k.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {secondaryKpis.map(k => (
          <Card
            key={k.label}
            className="hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate(k.link)}
          >
            <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn("p-1.5 sm:p-2 rounded-lg flex-shrink-0", k.bg)}>
                  <k.icon className={cn("w-4 h-4 sm:w-5 sm:h-5", k.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-xl font-bold leading-none">{k.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{k.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leads por Mes + Ingresos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              Leads por Mes (últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value,
                    name === "leads" ? "Total Leads" : "Convertidos"
                  ]}
                />
                <Legend
                  formatter={(value) => value === "leads" ? "Total" : "Convertidos"}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Ingresos Mensuales (CLP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData} margin={{ left: 10, right: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString("es-CL")}`, "Ingresos"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tasa de Conversión + Tiempo de Respuesta visual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              Tasa de Conversión Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={conversionTrend} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                <Tooltip formatter={(value: number) => [`${value}%`, "Conversión"]} />
                <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: "#8b5cf6" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline + Urgency side by side on this row */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={pipelineData}
                layout="vertical"
                margin={{ left: 20 }}
                onClick={(data: any) => {
                  if (data?.activePayload?.[0]?.payload?.stageId) {
                    navigate(`/admin/leads?stage=${data.activePayload[0].payload.stageId}`);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline + Urgency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leads Últimos 14 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={leadsTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribución por Urgencia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={urgencyData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  label={({ name, value }) => `${URGENCY_LABELS[name] ?? name}: ${value}`}
                  onClick={(data) => {
                    if (data?.name) {
                      navigate(`/admin/leads?urgency=${data.name}`);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
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
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Leads Recientes</CardTitle>
          <button
            className="text-xs text-primary hover:underline flex items-center gap-1"
            onClick={() => navigate("/admin/leads")}
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLeads.map(lead => {
              const hours = differenceInHours(new Date(), new Date(lead.created_at));
              const isOverdue = lead.urgency === "inmediata" ? hours >= 2 : hours >= 24;
              return (
                <div
                  key={lead.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm hover:bg-muted/30 active:scale-[0.99]",
                    isOverdue && (lead.pipeline_stage ?? "nuevo") === "nuevo" && "border-red-300 bg-red-50 hover:bg-red-100/60"
                  )}
                  onClick={() => navigate(`/admin/leads?open=${lead.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", lead.urgency === "inmediata" ? "bg-red-500" : lead.urgency === "previsión" ? "bg-green-500" : "bg-blue-500")} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{lead.name ?? "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.phone ?? lead.email ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-5 sm:ml-0">
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
    </div>
  );
}
