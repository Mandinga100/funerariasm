import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_RECIPIENTS = [
  "funerariasantamargarita2026@gmail.com",
  "mandinga_atim@hotmail.com",
];

// KPI thresholds for alerts
const THRESHOLDS = {
  overdueLeadsMax: 3,           // Alert if more than 3 overdue leads
  conversionRateMin: 10,        // Alert if conversion rate drops below 10%
  avgResponseTimeMaxMin: 120,   // Alert if avg response time exceeds 2 hours
  pendingPaymentsMax: 5,        // Alert if pending payments exceed 5
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: allow scheduled cron (via CRON_SECRET header) or admin/ceo JWT
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedCron = req.headers.get("x-cron-secret");
    const isCron = !!cronSecret && providedCron === cronSecret;

    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminCheck = createClient(supabaseUrl, serviceKey);
      const { data: roles } = await adminCheck.from("user_roles").select("role").eq("user_id", claims.claims.sub);
      if (!roles?.some((r: any) => r.role === "admin" || r.role === "ceo")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all data for KPI calculation
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [leadsRes, paymentsRes, activitiesRes, obituariesRes, memorialsRes] = await Promise.all([
      supabase.from("contact_leads").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("payment_transactions").select("amount, status, created_at"),
      supabase.from("lead_activities").select("lead_id, created_at, activity_type")
        .eq("activity_type", "pipeline_change").order("created_at", { ascending: true }).limit(1000),
      supabase.from("obituaries").select("id", { count: "exact", head: true }),
      supabase.from("memorials").select("id", { count: "exact", head: true }),
    ]);

    const allLeads = leadsRes.data ?? [];
    const allPayments = paymentsRes.data ?? [];
    const allActivities = activitiesRes.data ?? [];

    // Weekly leads
    const weeklyLeads = allLeads.filter(l => new Date(l.created_at) >= weekAgo);
    const prevWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekLeads = allLeads.filter(l => {
      const d = new Date(l.created_at);
      return d >= prevWeekStart && d < weekAgo;
    });

    // Overdue leads
    const overdueLeads = allLeads.filter(l => {
      if ((l.pipeline_stage ?? "nuevo") !== "nuevo") return false;
      const hours = (now.getTime() - new Date(l.created_at).getTime()) / 3600000;
      if (l.urgency === "inmediata") return hours >= 2;
      if (l.urgency === "normal") return hours >= 24;
      return hours >= 72;
    });

    // Conversion rate
    const convertedLeads = allLeads.filter(l => ["contratado", "cerrado"].includes(l.pipeline_stage ?? ""));
    const conversionRate = allLeads.length > 0 ? (convertedLeads.length / allLeads.length) * 100 : 0;

    // Revenue
    const verifiedPayments = allPayments.filter(p => p.status === "verified");
    const totalRevenue = verifiedPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const weeklyRevenue = allPayments
      .filter(p => p.status === "verified" && new Date(p.created_at) >= weekAgo)
      .reduce((s, p) => s + (p.amount || 0), 0);
    const pendingPayments = allPayments.filter(p => ["initiated", "pending_verification"].includes(p.status)).length;

    // Average response time
    const firstActivityByLead: Record<string, string> = {};
    allActivities.forEach(a => {
      if (!firstActivityByLead[a.lead_id]) firstActivityByLead[a.lead_id] = a.created_at;
    });
    const responseTimes: number[] = [];
    allLeads.forEach(l => {
      const first = firstActivityByLead[l.id];
      if (first) {
        const mins = (new Date(first).getTime() - new Date(l.created_at).getTime()) / 60000;
        if (mins >= 0 && mins < 10080) responseTimes.push(mins);
      }
    });
    const avgResponseTimeMin = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    // Pipeline breakdown
    const pipeline: Record<string, number> = {};
    allLeads.forEach(l => {
      const stage = l.pipeline_stage ?? "nuevo";
      pipeline[stage] = (pipeline[stage] || 0) + 1;
    });

    // Urgency breakdown
    const urgency: Record<string, number> = {};
    weeklyLeads.forEach(l => {
      const u = l.urgency ?? "normal";
      urgency[u] = (urgency[u] || 0) + 1;
    });

    // Build alerts
    const alerts: string[] = [];
    if (overdueLeads.length > THRESHOLDS.overdueLeadsMax) {
      alerts.push(`🔴 CRÍTICO: ${overdueLeads.length} leads vencidos sin contactar`);
    }
    if (conversionRate < THRESHOLDS.conversionRateMin && allLeads.length > 5) {
      alerts.push(`🟡 ALERTA: Tasa de conversión baja (${conversionRate.toFixed(1)}%)`);
    }
    if (avgResponseTimeMin > THRESHOLDS.avgResponseTimeMaxMin) {
      alerts.push(`🟠 ALERTA: Tiempo de respuesta promedio alto (${Math.round(avgResponseTimeMin)} min)`);
    }
    if (pendingPayments > THRESHOLDS.pendingPaymentsMax) {
      alerts.push(`🟡 ATENCIÓN: ${pendingPayments} pagos pendientes de verificación`);
    }
    const leadsTrend = weeklyLeads.length - prevWeekLeads.length;
    if (leadsTrend < -3) {
      alerts.push(`📉 TENDENCIA: Leads cayeron ${Math.abs(leadsTrend)} respecto a la semana anterior`);
    }

    // Generate AI summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiInsight = "";
    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: "Eres un analista de negocios para Funeraria Santa Margarita (Chile). Genera un resumen ejecutivo semanal breve (máximo 5 líneas) con insights accionables. Tono profesional y directo. Sin markdown."
              },
              {
                role: "user",
                content: `Resumen semanal:
- Leads esta semana: ${weeklyLeads.length} (semana anterior: ${prevWeekLeads.length})
- Leads vencidos: ${overdueLeads.length}
- Tasa conversión: ${conversionRate.toFixed(1)}%
- Ingresos semana: $${weeklyRevenue.toLocaleString("es-CL")} CLP
- Ingresos totales: $${totalRevenue.toLocaleString("es-CL")} CLP
- Tiempo respuesta promedio: ${Math.round(avgResponseTimeMin)} min
- Pagos pendientes: ${pendingPayments}
- Pipeline: ${Object.entries(pipeline).map(([k, v]) => `${k}: ${v}`).join(", ")}
- Urgencia semana: ${Object.entries(urgency).map(([k, v]) => `${k}: ${v}`).join(", ")}
${alerts.length > 0 ? `\nAlertas activas:\n${alerts.join("\n")}` : "Sin alertas críticas."}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiInsight = aiData.choices?.[0]?.message?.content ?? "";
        }
      } catch (e) {
        console.error("AI summary error:", e);
      }
    }

    // Create admin notifications for all admin/CEO users
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id, role")
      .in("role", ["admin", "ceo"]);

    const reportTitle = `📊 Reporte Semanal KPI — ${new Date().toLocaleDateString("es-CL")}`;
    const reportMessage = [
      `Leads semana: ${weeklyLeads.length} (${leadsTrend >= 0 ? "+" : ""}${leadsTrend} vs anterior)`,
      `Leads vencidos: ${overdueLeads.length}`,
      `Conversión: ${conversionRate.toFixed(1)}%`,
      `Ingresos semana: $${weeklyRevenue.toLocaleString("es-CL")}`,
      `Tiempo respuesta: ${Math.round(avgResponseTimeMin)} min`,
      `Pagos pendientes: ${pendingPayments}`,
      alerts.length > 0 ? `\n⚠️ ALERTAS:\n${alerts.join("\n")}` : "✅ Sin alertas críticas",
      aiInsight ? `\n💡 Insights IA:\n${aiInsight}` : "",
    ].filter(Boolean).join("\n");

    if (adminRoles?.length) {
      const notifications = adminRoles.map(r => ({
        user_id: r.user_id,
        title: reportTitle,
        message: reportMessage,
        type: alerts.length > 0 ? "warning" : "info",
        reference_type: "kpi_report",
      }));
      await supabase.from("admin_notifications").insert(notifications);
    }

    return new Response(JSON.stringify({
      success: true,
      report: {
        period: { from: weekAgo.toISOString(), to: now.toISOString() },
        kpis: {
          weeklyLeads: weeklyLeads.length,
          prevWeekLeads: prevWeekLeads.length,
          leadsTrend,
          overdueLeads: overdueLeads.length,
          conversionRate: Math.round(conversionRate * 10) / 10,
          totalRevenue,
          weeklyRevenue,
          avgResponseTimeMin: Math.round(avgResponseTimeMin),
          pendingPayments,
          obituaries: obituariesRes.count ?? 0,
          memorials: memorialsRes.count ?? 0,
        },
        pipeline,
        urgency,
        alerts,
        aiInsight,
        notifiedUsers: adminRoles?.length ?? 0,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-kpi-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
