const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { stats, monthlyData, pipelineData, urgencyData, dateRange } = await req.json();

    if (!stats) {
      return new Response(JSON.stringify({ error: "stats is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rangeLabel = dateRange?.from && dateRange?.to
      ? `del ${dateRange.from} al ${dateRange.to}`
      : "período completo (sin filtro de fechas)";

    const systemPrompt = `Eres un analista de negocios senior especializado en la industria funeraria chilena. 
Generas resúmenes ejecutivos claros, concisos y accionables para el CEO de Funeraria Santa Margarita.

REGLAS:
- Usa español chileno formal y profesional.
- Sé directo y conciso. Máximo 5 insights clave.
- Cada insight debe ser accionable (qué hacer al respecto).
- Usa emojis moderadamente para legibilidad (📈 📉 ⚠️ ✅ 💡).
- Formatea en Markdown con títulos ## y listas.
- Si los datos son escasos o cero, indícalo y sugiere acciones para mejorar la captación.
- Nunca inventes datos. Basa todo en los números proporcionados.
- Incluye una sección final "Recomendaciones Prioritarias" con 3 acciones concretas.`;

    const userPrompt = `Genera un resumen ejecutivo del dashboard de analíticas para el ${rangeLabel}.

DATOS DEL PERÍODO:
- Total Leads: ${stats.totalLeads}
- Leads Nuevos (sin contactar): ${stats.newLeads}
- Leads Vencidos (sin respuesta a tiempo): ${stats.overdueLeads}
- Tasa de Conversión: ${stats.conversionRate?.toFixed(1)}%
- Valor Promedio por Venta: $${Math.round(stats.avgDealValue || 0).toLocaleString("es-CL")} CLP
- Tiempo Promedio de Respuesta: ${Math.round(stats.avgResponseTimeMin || 0)} minutos
- Ingresos Verificados: $${(stats.totalRevenue || 0).toLocaleString("es-CL")} CLP
- Pagos Pendientes: ${stats.pendingPayments}

PIPELINE:
${(pipelineData || []).map((p: any) => `- ${p.stage}: ${p.count} leads`).join("\n")}

TENDENCIA MENSUAL (últimos 6 meses):
${(monthlyData || []).map((m: any) => `- ${m.month}: ${m.leads} leads, ${m.converted} convertidos, $${(m.revenue || 0).toLocaleString("es-CL")} ingresos`).join("\n")}

DISTRIBUCIÓN POR URGENCIA:
${(urgencyData || []).map((u: any) => `- ${u.name}: ${u.value}`).join("\n")}

Genera el resumen ejecutivo ahora.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intente más tarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    return new Response(JSON.stringify({ success: true, summary: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-executive-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
