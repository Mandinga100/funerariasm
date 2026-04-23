import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ────────────────────────────────────────────────────────────────────
// Catálogo OFICIAL de precios (sincronizado con src/components/PlansSection.tsx)
// SOLO se usa estimated_value si el lead trae uno de estos planes o
// si su fuente es la página /planes. Si no, NO inventamos precio.
// ────────────────────────────────────────────────────────────────────
const PLAN_PRICES: Record<string, { name: string; price: number }> = {
  margarita: { name: "Plan Margarita", price: 1290000 },
  azucena: { name: "Plan Azucena", price: 1390000 },
  acacia: { name: "Plan Acacia", price: 1990000 },
  orquidea: { name: "Plan Orquídea", price: 1990000 },
  jazmin: { name: "Plan Jazmín", price: 2790000 },
  castano: { name: "Plan Castaño", price: 3990000 },
  rauli: { name: "Plan Raulí", price: 3990000 },
};

function resolvePlanPrice(rawPlan?: string | null): number | null {
  if (!rawPlan) return null;
  const key = rawPlan.toLowerCase().replace(/^plan[\s_]+/i, "").replace(/í/g, "i").replace(/ñ/g, "n").trim();
  return PLAN_PRICES[key]?.price ?? null;
}

function comesFromPlansPage(lead: any): boolean {
  const src = (lead.source ?? "").toLowerCase();
  const meta = lead.metadata ?? {};
  const path = (meta.pathname ?? meta.referrer ?? "").toString().toLowerCase();
  return src.includes("plan") || path.includes("/planes") || path.includes("plan");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Require admin/ceo JWT
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
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", claims.claims.sub);
    if (!roles?.some((r: any) => r.role === "admin" || r.role === "ceo")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { leadId, mode } = body;

    // Mode "batch" — classify multiple leads and return sorted results
    if (mode === "batch") {
      const { data: leads, error } = await supabase
        .from("contact_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const unclassified = (leads ?? []).filter(
        (l: any) => !l.ai_summary && l.message
      ).slice(0, 15);

      const results: any[] = [];
      for (const lead of unclassified) {
        try {
          const classification = await classifyWithFallback(lead, supabase, LOVABLE_API_KEY);
          const updates = buildUpdates(lead, classification);
          await supabase.from("contact_leads").update(updates).eq("id", lead.id);
          await logActivity(supabase, lead.id, classification);
          results.push({ id: lead.id, classification, source: classification.__source });
        } catch (e) {
          console.error(`Error classifying lead ${lead.id}:`, e);
          results.push({ id: lead.id, error: String(e) });
        }
      }

      // Now re-sort ALL leads by priority score
      const { data: allLeads } = await supabase
        .from("contact_leads")
        .select("id, urgency, pipeline_stage, ai_classification, created_at, estimated_value")
        .order("created_at", { ascending: false })
        .limit(500);

      const sorted = (allLeads ?? [])
        .map((l: any) => ({
          id: l.id,
          score: computePriorityScore(l),
        }))
        .sort((a: any, b: any) => b.score - a.score);

      return new Response(JSON.stringify({
        success: true,
        classified: results.length,
        priority_order: sorted.map((s: any) => s.id),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Single lead classification
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadError } = await supabase
      .from("contact_leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const classification = await classifyWithFallback(lead, supabase, LOVABLE_API_KEY);
    const updates = buildUpdates(lead, classification);
    await supabase.from("contact_leads").update(updates).eq("id", lead.id);
    await logActivity(supabase, leadId, classification);

    return new Response(JSON.stringify({
      success: true,
      classification,
      source: classification.__source, // "ai" | "heuristic"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

class RateLimitError extends Error {}
class PaymentError extends Error {}

// ────────────────────────────────────────────────────────────────────
// Wrapper: intenta IA primero, si falla por rate limit / payment / red
// usa el clasificador heurístico determinístico (siempre disponible).
// ────────────────────────────────────────────────────────────────────
async function classifyWithFallback(lead: any, supabase: any, apiKey?: string) {
  if (apiKey) {
    try {
      const aiResult = await classifyLeadAI(lead, apiKey);
      // Reforzar valor estimado con fuente confiable
      const realPrice = resolveRealEstimatedValue(lead);
      if (realPrice !== null) aiResult.estimated_value = realPrice;
      else if (!comesFromPlansPage(lead) && !lead.selected_plan) {
        // Sin info confiable de precio → no inventar.
        aiResult.estimated_value = 0;
      }
      return { ...aiResult, __source: "ai" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[classify-lead] IA falló (${msg}). Usando fallback heurístico.`);
    }
  } else {
    console.warn("[classify-lead] LOVABLE_API_KEY no configurada. Usando fallback heurístico.");
  }
  // Fallback: heurística + base histórica
  const heuristic = await classifyHeuristic(lead, supabase);
  return { ...heuristic, __source: "heuristic" };
}

// ────────────────────────────────────────────────────────────────────
// Clasificador heurístico (rule-based) — siempre disponible.
// Usa: keywords, plan, origen, tiempo, comuna, leads históricos similares.
// ────────────────────────────────────────────────────────────────────
async function classifyHeuristic(lead: any, supabase: any) {
  const text = `${lead.message ?? ""} ${lead.whatsapp_message ?? ""}`.toLowerCase();
  const hoursElapsed = Math.round((Date.now() - new Date(lead.created_at).getTime()) / 3600000);

  // ── 1. Detectar URGENCIA por keywords ──
  const URGENT_KW = [
    "fallec", "murió", "murio", "falleció", "fallecio", "difunto", "difunta",
    "velorio", "velatorio", "hoy", "ahora", "urgent", "emergencia",
    "acaba de", "recién", "recien", "esta noche", "esta madrugada",
    "necesito ya", "necesito hoy", "cremación urgente", "traslado urgente",
  ];
  const COTIZACION_KW = [
    "cotiz", "precio", "valor", "cuánto", "cuanto", "cuesta",
    "presupuesto", "tarifa", "información sobre planes", "info plan",
  ];
  const PREVISION_KW = [
    "previsión", "prevision", "futuro", "anticipa", "planificar",
    "plan funerario", "memorial", "legado", "en vida", "antes",
  ];
  const TRASLADO_KW = ["traslado", "trasladar", "llevar", "transportar", "repatria"];
  const CREMACION_KW = ["crema", "incinera"];
  const RECLAMO_KW = ["reclamo", "queja", "problema", "mala atención", "demanda"];

  const hits = (kws: string[]) => kws.filter((k) => text.includes(k)).length;

  let suggested_urgency: "immediate" | "cotizacion" | "prevision" = "cotizacion";
  let intent = "consulta_general";
  let emotional_context: "duelo_activo" | "planificacion_tranquila" | "urgencia_familiar" | "consulta_informativa" | "insatisfaccion" = "consulta_informativa";

  // Si la urgencia ya viene marcada (chatbot/form) y es válida, respétala
  const validUrg = ["immediate", "cotizacion", "prevision"];
  if (lead.urgency && validUrg.includes(lead.urgency)) {
    suggested_urgency = lead.urgency;
  } else if (hits(URGENT_KW) >= 1) {
    suggested_urgency = "immediate";
    emotional_context = "duelo_activo";
  } else if (hits(PREVISION_KW) >= 1) {
    suggested_urgency = "prevision";
    emotional_context = "planificacion_tranquila";
  } else if (hits(COTIZACION_KW) >= 1 || lead.selected_plan) {
    suggested_urgency = "cotizacion";
    emotional_context = "consulta_informativa";
  }

  // ── 2. Intent ──
  if (hits(RECLAMO_KW) >= 1) intent = "reclamo", emotional_context = "insatisfaccion";
  else if (suggested_urgency === "immediate") intent = "servicio_funerario_urgente", emotional_context = "duelo_activo";
  else if (hits(TRASLADO_KW) >= 1) intent = "traslado";
  else if (hits(CREMACION_KW) >= 1) intent = "cremacion";
  else if (suggested_urgency === "prevision") intent = "prevision_funeraria";
  else if (lead.selected_plan || hits(COTIZACION_KW) >= 1) intent = "cotizacion";

  // ── 3. Canal recomendado ──
  let recommended_channel: "llamada_telefonica" | "whatsapp" | "email" | "visita_presencial" =
    suggested_urgency === "immediate"
      ? "llamada_telefonica"
      : lead.phone
        ? "whatsapp"
        : lead.email
          ? "email"
          : "llamada_telefonica";

  // ── 4. SLA según urgencia (base, podrá ajustarse con histórico) ──
  let sla_hours =
    suggested_urgency === "immediate" ? 1 :
    suggested_urgency === "cotizacion" ? 24 :
    72;

  // ── 5. Consultar analíticas históricas para esta combinación ──
  // (urgency + intent en últimos 180 días → promedios de prioridad, SLA, canal, valor)
  const stats = await getHistoricalStats(supabase, suggested_urgency, intent);

  // ── 6. Score de prioridad: base + ajuste por histórico ──
  let priority_score = 50;
  if (suggested_urgency === "immediate") priority_score = 95;
  else if (suggested_urgency === "cotizacion") priority_score = 60;
  else priority_score = 35;

  // Si hay suficiente muestra histórica (≥5), promediar con base heurística
  if (stats && stats.sample_size >= 5 && stats.avg_priority) {
    priority_score = Math.round((priority_score + stats.avg_priority) / 2);
  }

  // Ajustes por antigüedad sin contactar
  if (lead.pipeline_stage === "nuevo") {
    if (suggested_urgency === "immediate" && hoursElapsed > 1) priority_score = Math.min(100, priority_score + 5);
    if (suggested_urgency === "cotizacion" && hoursElapsed > 24) priority_score = Math.min(100, priority_score + 10);
  } else {
    priority_score = Math.max(20, priority_score - 15);
  }
  if (intent === "reclamo") priority_score = Math.max(priority_score, 85);

  // ── 6b. SLA: usar promedio histórico si confiable ──
  if (stats && stats.sample_size >= 5 && stats.avg_sla_hours) {
    // Promedio entre regla base y promedio histórico (capado a min seguro)
    const baseSla = sla_hours;
    sla_hours = Math.max(
      suggested_urgency === "immediate" ? 1 : 6,
      Math.round((baseSla + stats.avg_sla_hours) / 2),
    );
  }

  // ── 6c. Canal recomendado: si el histórico tiene un canal claramente dominante, úsalo ──
  if (stats && stats.sample_size >= 10 && stats.top_channel) {
    recommended_channel = stats.top_channel as typeof recommended_channel;
  }

  // ── 7. Valor estimado: SOLO con info confiable ──
  const realPrice = resolveRealEstimatedValue(lead);
  let estimated_value = 0;
  if (realPrice !== null) {
    estimated_value = realPrice;
  } else if (comesFromPlansPage(lead) && suggested_urgency === "cotizacion") {
    // Vino desde /planes pero sin plan: priorizar promedio (urgency+intent), si no hay → urgency global
    estimated_value = stats?.avg_value ?? (await getHistoricalAvgValue(supabase, suggested_urgency)) ?? 0;
  } else {
    // Sin info real → 0 (no inventar)
    estimated_value = 0;
  }

  // ── 7. Resumen empático ──
  const nameStr = lead.name ?? "Contacto";
  const planStr = lead.selected_plan ? ` interesado en ${lead.selected_plan}` : "";
  const summaryByUrgency: Record<string, string> = {
    immediate: `${nameStr} reporta fallecimiento${planStr}. Requiere asistencia inmediata, la familia está en duelo activo y necesita coordinación urgente del servicio funerario.`,
    cotizacion: `${nameStr} está cotizando servicios${planStr}. Oportunidad activa: responder con detalles de planes, valores y disponibilidad antes de 24h.`,
    prevision: `${nameStr} consulta planificación a futuro${planStr}. Venta consultiva: agendar conversación para conocer necesidades familiares.`,
  };
  const summary = summaryByUrgency[suggested_urgency];

  // ── 8. Próximo paso accionable ──
  const next_step =
    suggested_urgency === "immediate"
      ? `📞 Llamar AHORA al ${lead.phone ?? "contacto"} y coordinar retiro/velatorio.`
      : suggested_urgency === "cotizacion"
        ? `💬 Enviar cotización por WhatsApp con valores de ${lead.selected_plan ?? "planes solicitados"} y agendar visita.`
        : `📅 Agendar reunión informativa para presentar planes de previsión.`;

  // ── 9. Tags útiles ──
  const tags: string[] = [];
  if (hits(CREMACION_KW)) tags.push("cremacion");
  if (hits(TRASLADO_KW)) tags.push("traslado");
  if (text.includes("flor")) tags.push("flores");
  if (suggested_urgency === "prevision") tags.push("prevision");
  if (lead.comuna) tags.push(lead.comuna.toLowerCase());
  if (lead.selected_plan) tags.push(lead.selected_plan.toLowerCase().replace(/\s+/g, "-"));
  if (!tags.length) tags.push(suggested_urgency);

  return {
    summary,
    suggested_urgency,
    intent,
    priority_score,
    next_step,
    recommended_channel,
    emotional_context,
    estimated_value,
    sla_hours,
    tags,
  };
}

// Resuelve precio real SOLO si el lead trae plan reconocido
function resolveRealEstimatedValue(lead: any): number | null {
  return resolvePlanPrice(lead.selected_plan);
}

// Promedio histórico de valor para leads con misma urgencia (últimos 90d)
async function getHistoricalAvgValue(supabase: any, urgency: string): Promise<number | null> {
  try {
    const since = new Date(Date.now() - 90 * 24 * 3600000).toISOString();
    const { data } = await supabase
      .from("contact_leads")
      .select("estimated_value")
      .eq("urgency", urgency)
      .gt("estimated_value", 0)
      .gte("created_at", since)
      .limit(100);
    if (!data || data.length === 0) return null;
    const avg = data.reduce((s: number, r: any) => s + (r.estimated_value ?? 0), 0) / data.length;
    return Math.round(avg / 10000) * 10000; // redondear a 10K
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────
// Clasificador IA (puede fallar → fallback)
// ────────────────────────────────────────────────────────────────────
async function classifyLeadAI(lead: any, apiKey: string) {
  const now = new Date();
  const createdAt = new Date(lead.created_at);
  const hoursElapsed = Math.round((now.getTime() - createdAt.getTime()) / 3600000);

  const planPriceHint = resolveRealEstimatedValue(lead);
  const priceGuidance = planPriceHint
    ? `IMPORTANTE: este lead seleccionó un plan oficial. Usa exactamente CLP ${planPriceHint} como estimated_value.`
    : comesFromPlansPage(lead)
      ? "El lead llegó desde /planes pero no eligió un plan específico. Usa un rango conservador 1.300.000-2.000.000 CLP."
      : "El lead NO viene de la página de planes ni eligió plan. Usa estimated_value=0 (no inventes precios).";

  const prompt = `Eres un experto en gestión de servicios funerarios en Chile con 20 años de experiencia.
Analiza este lead y proporciona una clasificación completa para el CRM de la funeraria.

CONTEXTO DEL NEGOCIO:
- Los servicios funerarios inmediatos (fallecimiento reciente) tienen máxima prioridad.
- Las consultas de precios/cotizaciones son oportunidades activas que deben responderse en 24h.
- Los servicios de previsión son ventas consultivas de ciclo largo.

DATOS DEL LEAD:
- Nombre: ${lead.name ?? "No proporcionado"}
- Teléfono: ${lead.phone ?? "No proporcionado"}
- Email: ${lead.email ?? "No proporcionado"}
- Tipo de contacto: ${lead.contact_type}
- Mensaje: ${lead.message ?? "Sin mensaje"}
- Fuente: ${lead.source ?? "Desconocida"}
- Plan seleccionado: ${lead.selected_plan ?? "Ninguno"}
- Comuna: ${lead.comuna ?? "No especificada"}
- Urgencia actual: ${lead.urgency ?? "No clasificada"}
- Horas desde contacto: ${hoursElapsed}h
- Etapa pipeline: ${lead.pipeline_stage ?? "nuevo"}

VALOR ESTIMADO (REGLA ESTRICTA):
${priceGuidance}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "Eres un CRM inteligente especializado en servicios funerarios en Chile. Clasifica leads con empatía y precisión. NUNCA inventes precios si no hay info confiable.",
        },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_lead",
            description: "Clasificar y priorizar un lead de funeraria",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string" },
                suggested_urgency: { type: "string", enum: ["immediate", "cotizacion", "prevision"] },
                intent: { type: "string", enum: ["servicio_funerario_urgente","traslado","cremacion","cotizacion","prevision_funeraria","memorial_legado","consulta_general","reclamo"] },
                priority_score: { type: "number" },
                next_step: { type: "string" },
                recommended_channel: { type: "string", enum: ["llamada_telefonica","whatsapp","email","visita_presencial"] },
                emotional_context: { type: "string", enum: ["duelo_activo","planificacion_tranquila","urgencia_familiar","consulta_informativa","insatisfaccion"] },
                estimated_value: { type: "number" },
                sla_hours: { type: "number" },
                tags: { type: "array", items: { type: "string" } },
              },
              required: ["summary","suggested_urgency","intent","priority_score","next_step","recommended_channel","emotional_context","estimated_value","sla_hours","tags"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify_lead" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    if (response.status === 429) throw new RateLimitError("Rate limited");
    if (response.status === 402) throw new PaymentError("Payment required");
    throw new Error(`AI error: ${response.status}`);
  }

  const aiResult = await response.json();
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");

  return JSON.parse(toolCall.function.arguments);
}

function buildUpdates(lead: any, c: any) {
  const channelEmoji: Record<string, string> = {
    llamada_telefonica: "📞", whatsapp: "💬", email: "📧", visita_presencial: "🏠",
  };
  const emotionalEmoji: Record<string, string> = {
    duelo_activo: "🕊️", planificacion_tranquila: "🌿", urgencia_familiar: "⚡",
    consulta_informativa: "ℹ️", insatisfaccion: "⚠️",
  };
  const sourceTag = c.__source === "heuristic" ? "🧠 Análisis heurístico (sin IA)" : "🤖 Análisis IA";
  const summaryParts = [
    c.summary,
    "",
    `${emotionalEmoji[c.emotional_context] ?? ""} Contexto: ${c.emotional_context?.replace(/_/g, " ")}`,
    `${channelEmoji[c.recommended_channel] ?? ""} Contactar vía: ${c.recommended_channel?.replace(/_/g, " ")}`,
    `📋 Próximo paso: ${c.next_step}`,
    `⏱️ SLA: ${c.sla_hours}h máx. para primer contacto`,
    c.tags?.length ? `🏷️ ${c.tags.join(", ")}` : "",
    "",
    sourceTag,
  ].filter(Boolean).join("\n");

  // Limpiar marcador interno antes de guardar
  const { __source, ...cleanClassification } = c;

  const updates: Record<string, any> = {
    ai_summary: summaryParts,
    ai_classification: { ...cleanClassification, _source: __source },
    intent: c.intent,
  };

  const validUrgencies = ["immediate", "cotizacion", "prevision"];
  if (!lead.urgency || !validUrgencies.includes(lead.urgency)) {
    updates.urgency = c.suggested_urgency;
  }

  // Valor estimado: solo actualizar si el clasificador lo determinó con base real
  if (c.estimated_value && c.estimated_value > 0) {
    updates.estimated_value = c.estimated_value;
  }

  return updates;
}

function computePriorityScore(lead: any): number {
  if (lead.ai_classification?.priority_score) {
    return lead.ai_classification.priority_score;
  }
  let score = 50;
  const urgency = lead.urgency ?? "normal";
  if (urgency === "immediate" || urgency === "inmediata") score += 40;
  else if (urgency === "normal") score += 10;
  else score -= 10;
  if (lead.pipeline_stage === "nuevo") score += 10;
  if ((lead.estimated_value ?? 0) > 1000000) score += 10;
  const hoursElapsed = (Date.now() - new Date(lead.created_at).getTime()) / 3600000;
  if (urgency === "immediate" && hoursElapsed > 2) score += 15;
  if (urgency === "normal" && hoursElapsed > 24) score += 10;
  return Math.min(100, Math.max(0, score));
}

async function logActivity(supabase: any, leadId: string, c: any) {
  const sourceLabel = c.__source === "heuristic" ? "heurística" : "IA";
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    activity_type: "ai_classification",
    description: `Clasificación ${sourceLabel}: urgencia ${c.suggested_urgency}, intención ${c.intent}, prioridad ${c.priority_score}/100, SLA ${c.sla_hours}h`,
    metadata: c,
  });
}
