import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MemorialOfferingsWidget from "@/components/admin/MemorialOfferingsWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpen, Heart, Users, MessageSquare, DollarSign, Clock, TrendingUp, AlertTriangle, ArrowRight, CalendarDays, Percent, Timer, Banknote, FileDown, Loader2, CalendarIcon, RotateCcw, Sparkles, RefreshCw, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AIActionTooltip } from "@/components/admin/AIActionTooltip";
import { format, subDays, subMonths, differenceInHours, differenceInMinutes, startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";

// Lazy-load all charts so the recharts bundle (~165 kB gzip) is fetched only
// after the dashboard shell + KPI cards render — keeps the admin first paint fast.
const DashboardCharts = lazy(() => import("./DashboardCharts"));
const ComunaAnalyticsWidget = lazy(() => import("@/components/admin/ComunaAnalyticsWidget"));

/** Skeleton placeholder shown while the charts chunk loads. */
const ChartsSkeleton = () => (
  <div className="space-y-6">
    {[0, 1, 2, 3].map((row) => (
      <div key={row} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="h-[320px] rounded-lg border bg-muted/30 animate-pulse" />
        <div className="h-[320px] rounded-lg border bg-muted/30 animate-pulse" />
      </div>
    ))}
  </div>
);
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
  totalCases: number;
  casesRevenue: number;
  leadToCaseRate: number;
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
  casesRevenue: number;
}

interface CasesByStage {
  stage: string;
  stageId: string;
  count: number;
}

interface CasesByPayment {
  status: string;
  count: number;
  color: string;
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
  const { isCeo } = useAuth();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<Stats>({
    obituaries: 0, memorials: 0, totalLeads: 0, newLeads: 0,
    contactedLeads: 0, condolences: 0, pendingPayments: 0,
    totalRevenue: 0, overdueLeads: 0, conversionRate: 0,
    avgDealValue: 0, avgResponseTimeMin: 0,
    totalCases: 0, casesRevenue: 0, leadToCaseRate: 0,
  });
  const [pipelineData, setPipelineData] = useState<LeadByStage[]>([]);
  const [casesStageData, setCasesStageData] = useState<CasesByStage[]>([]);
  const [casesPaymentData, setCasesPaymentData] = useState<CasesByPayment[]>([]);
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
      const [o, m, leads, c, payments, activities, casesRes] = await Promise.all([
        supabase.from("obituaries").select("id", { count: "exact", head: true }),
        supabase.from("memorials").select("id", { count: "exact", head: true }),
        supabase.from("contact_leads").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("condolences").select("id", { count: "exact", head: true }),
        supabase.from("payment_transactions").select("amount, status, created_at"),
        supabase.from("lead_activities").select("lead_id, created_at, activity_type").eq("activity_type", "pipeline_change").order("created_at", { ascending: true }).limit(1000),
        supabase.from("service_cases").select("*").order("created_at", { ascending: false }).limit(1000),
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
      const allCases = (casesRes.data ?? []).filter(c => filterByRange(c.created_at));
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

      // Cases metrics
      const totalCases = allCases.length;
      const casesRevenue = allCases
        .filter(c => c.pipeline_stage === "contratado" && c.payment_status === "pagado")
        .reduce((s, c) => s + (c.total_amount || 0), 0);
      const leadToCaseRate = allLeads.length > 0 ? (totalCases / allLeads.length) * 100 : 0;

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
        totalCases,
        casesRevenue,
        leadToCaseRate,
      });

      // Cases by pipeline stage
      const caseStages = ["contactado", "cotizado", "contratado", "cerrado"];
      setCasesStageData(caseStages.map(stage => ({
        stage: PIPELINE_LABELS[stage] || stage,
        stageId: stage,
        count: allCases.filter(c => (c.pipeline_stage ?? "contactado") === stage).length,
      })));

      // Cases by payment status
      const PAYMENT_COLORS: Record<string, string> = {
        pendiente: "#f59e0b",
        cotizado: "#3b82f6",
        aprobado: "#8b5cf6",
        pagado: "#22c55e",
        cancelado: "#ef4444",
      };
      const PAYMENT_LABELS: Record<string, string> = {
        pendiente: "Pendiente",
        cotizado: "Cotizado",
        aprobado: "Aprobado",
        pagado: "Pagado",
        cancelado: "Cancelado",
      };
      const paymentStatuses = ["pendiente", "cotizado", "aprobado", "pagado", "cancelado"];
      setCasesPaymentData(paymentStatuses.map(status => ({
        status: PAYMENT_LABELS[status] || status,
        count: allCases.filter(c => (c.payment_status ?? "pendiente") === status).length,
        color: PAYMENT_COLORS[status] || "#94a3b8",
      })).filter(d => d.count > 0));

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
        const monthCasesRevenue = allCases
          .filter(cs => cs.pipeline_stage === "contratado" && cs.payment_status === "pagado" && new Date(cs.created_at) >= monthStart && new Date(cs.created_at) <= monthEnd)
          .reduce((s, cs) => s + (cs.total_amount || 0), 0);

        monthly.push({
          month: monthLabel,
          leads: monthLeads.length,
          converted: monthConverted.length,
          revenue: monthRevenue,
          casesRevenue: monthCasesRevenue,
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
    { label: "Leads Nuevos", value: stats.newLeads, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", link: "/admin/leads?stage=nuevo" },
    { label: "Leads Vencidos", value: stats.overdueLeads, icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40", link: "/admin/leads?filter=overdue" },
    { label: "Total Casos", value: stats.totalCases, icon: Briefcase, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/40", link: "/admin/casos" },
    { label: "Ingresos Casos", value: `$${stats.casesRevenue.toLocaleString("es-CL")}`, icon: DollarSign, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/40", link: "/admin/casos" },
    { label: "Tasa Conversión", value: `${stats.conversionRate.toFixed(1)}%`, icon: Percent, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40", link: "/admin/leads" },
    { label: "Lead → Caso", value: `${stats.leadToCaseRate.toFixed(1)}%`, icon: TrendingUp, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40", link: "/admin/casos" },
    { label: "Tiempo Respuesta", value: formatMinutes(stats.avgResponseTimeMin), icon: Timer, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40", link: "/admin/leads" },
    { label: "Pagos Pendientes", value: stats.pendingPayments, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", link: "/admin/pagos?status=pending" },
  ];

  const secondaryKpis = [
    { label: "Ingresos Verificados", value: `$${stats.totalRevenue.toLocaleString("es-CL")}`, icon: Banknote, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/40", link: "/admin/pagos" },
    { label: "Obituarios", value: stats.obituaries, icon: BookOpen, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40", link: "/admin/obituarios" },
    { label: "Legados", value: stats.memorials, icon: Heart, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40", link: "/admin/legados-eternos" },
    { label: "Condolencias", value: stats.condolences, icon: MessageSquare, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", link: "/admin/legados-eternos" },
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
          <AIActionTooltip
            actionKey="dashboard.executive_summary"
            description="Analiza con IA los KPIs del rango seleccionado (leads, casos, ingresos, conversión) y entrega un resumen ejecutivo en lenguaje natural con tendencias, alertas y recomendaciones priorizadas."
          >
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
          </AIActionTooltip>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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

      {/* All charts — lazy-loaded module so recharts doesn't block first paint */}
      <Suspense fallback={<ChartsSkeleton />}>
        <DashboardCharts
          monthlyData={monthlyData}
          casesStageData={casesStageData}
          casesPaymentData={casesPaymentData}
          conversionTrend={conversionTrend}
          pipelineData={pipelineData}
          leadsTimeline={leadsTimeline}
          urgencyData={urgencyData}
        />
      </Suspense>

      {/* Top comunas widget — tracking propio de landing pages /funeraria/:comuna */}
      <Suspense fallback={<div className="h-64 rounded-lg border bg-muted/30 animate-pulse" />}>
        <ComunaAnalyticsWidget />
      </Suspense>

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
                    isOverdue && (lead.pipeline_stage ?? "nuevo") === "nuevo" && "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 hover:bg-red-100/60 dark:hover:bg-red-950/50"
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
