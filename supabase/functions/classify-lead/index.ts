import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
          const classification = await classifyLead(lead, LOVABLE_API_KEY);
          const updates = buildUpdates(lead, classification);
          await supabase.from("contact_leads").update(updates).eq("id", lead.id);
          await logActivity(supabase, lead.id, classification);
          results.push({ id: lead.id, classification });
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

    const classification = await classifyLead(lead, LOVABLE_API_KEY);
    const updates = buildUpdates(lead, classification);
    await supabase.from("contact_leads").update(updates).eq("id", lead.id);
    await logActivity(supabase, leadId, classification);

    return new Response(JSON.stringify({ success: true, classification }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-lead error:", e);
    const status = e instanceof RateLimitError ? 429 : e instanceof PaymentError ? 402 : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

class RateLimitError extends Error {}
class PaymentError extends Error {}

async function classifyLead(lead: any, apiKey: string) {
  const now = new Date();
  const createdAt = new Date(lead.created_at);
  const hoursElapsed = Math.round((now.getTime() - createdAt.getTime()) / 3600000);

  const prompt = `Eres un experto en gestión de servicios funerarios en Chile con 20 años de experiencia.
Analiza este lead y proporciona una clasificación completa para el CRM de la funeraria.

CONTEXTO DEL NEGOCIO:
- Los servicios funerarios inmediatos (fallecimiento reciente) tienen máxima prioridad: la familia está en duelo y necesita respuesta en menos de 2 horas.
- Las consultas de precios/cotizaciones son oportunidades activas que deben responderse en 24h.
- Los servicios de previsión (planificación en vida) son ventas consultivas de ciclo largo.
- Los memoriales y legados son servicios de valor añadido post-servicio.

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

INSTRUCCIONES DE CLASIFICACIÓN:

URGENCIA:
- "immediate" = Fallecimiento reciente o inminente, necesita servicio YA. Palabras clave: fallecimiento, murió, velatorio, urgente, hoy, ahora, cremación urgente.
- "normal" = Consulta activa sobre precios, planes, cotización. Interés real pero no emergencia.
- "previsión" = Planificación futura en vida, consulta informativa, memorial, legado.

INTENCIÓN (detectar la verdadera necesidad):
- "servicio_funerario_urgente" = Necesita servicio funerario completo inmediatamente
- "traslado" = Necesita traslado de restos (nacional o internacional)
- "cremacion" = Consulta específica sobre cremación
- "cotizacion" = Pide precios o cotización de planes
- "prevision_funeraria" = Quiere contratar servicio de previsión (en vida)
- "memorial_legado" = Interesado en memorial digital o legado
- "consulta_general" = Pregunta general informativa
- "reclamo" = Queja o reclamo sobre servicio

SCORING DE PRIORIDAD (0-100):
- Fallecimiento reciente + sin contactar = 95-100
- Fallecimiento reciente + ya contactado = 70-80
- Cotización activa sin responder > 12h = 60-75
- Cotización respondida, esperando decisión = 40-55
- Previsión interesada = 30-45
- Consulta general = 10-25

VALOR ESTIMADO en CLP:
- Servicio funerario completo: 1.500.000 - 5.000.000
- Cremación: 800.000 - 2.500.000
- Traslado: 500.000 - 3.000.000
- Plan previsión: 300.000 - 1.200.000
- Memorial/legado: 50.000 - 300.000
- Consulta: 0`;

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
          content: "Eres un CRM inteligente especializado en servicios funerarios en Chile. Clasifica leads con empatía, profesionalismo y precisión comercial. Responde SOLO con la herramienta provista.",
        },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_lead",
            description: "Clasificar y priorizar un lead de funeraria profesionalmente",
            parameters: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description: "Resumen empático y profesional del caso en 2-3 líneas. Incluir contexto emocional si aplica.",
                },
                suggested_urgency: {
                  type: "string",
                  enum: ["immediate", "normal", "previsión"],
                  description: "Nivel de urgencia del servicio requerido",
                },
                intent: {
                  type: "string",
                  enum: [
                    "servicio_funerario_urgente",
                    "traslado",
                    "cremacion",
                    "cotizacion",
                    "prevision_funeraria",
                    "memorial_legado",
                    "consulta_general",
                    "reclamo",
                  ],
                  description: "Intención principal del contacto",
                },
                priority_score: {
                  type: "number",
                  description: "Score de prioridad 0-100 basado en urgencia, tiempo transcurrido y valor",
                },
                next_step: {
                  type: "string",
                  description: "Próximo paso concreto y accionable para el asesor funerario",
                },
                recommended_channel: {
                  type: "string",
                  enum: ["llamada_telefonica", "whatsapp", "email", "visita_presencial"],
                  description: "Canal recomendado para contactar al lead",
                },
                emotional_context: {
                  type: "string",
                  enum: ["duelo_activo", "planificacion_tranquila", "urgencia_familiar", "consulta_informativa", "insatisfaccion"],
                  description: "Estado emocional probable del contacto",
                },
                estimated_value: {
                  type: "number",
                  description: "Valor estimado en CLP del servicio potencial",
                },
                sla_hours: {
                  type: "number",
                  description: "Horas máximas de SLA para primer contacto según urgencia",
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Etiquetas relevantes: cremacion, velatorio, traslado, flores, prevision, etc.",
                },
              },
              required: [
                "summary",
                "suggested_urgency",
                "intent",
                "priority_score",
                "next_step",
                "recommended_channel",
                "emotional_context",
                "estimated_value",
                "sla_hours",
                "tags",
              ],
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
    if (response.status === 429) throw new RateLimitError("Rate limited, please try again later");
    if (response.status === 402) throw new PaymentError("Payment required for AI");
    throw new Error(`AI error: ${response.status}`);
  }

  const aiResult = await response.json();
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");

  return JSON.parse(toolCall.function.arguments);
}

function buildUpdates(lead: any, c: any) {
  const channelEmoji: Record<string, string> = {
    llamada_telefonica: "📞",
    whatsapp: "💬",
    email: "📧",
    visita_presencial: "🏠",
  };

  const emotionalEmoji: Record<string, string> = {
    duelo_activo: "🕊️",
    planificacion_tranquila: "🌿",
    urgencia_familiar: "⚡",
    consulta_informativa: "ℹ️",
    insatisfaccion: "⚠️",
  };

  const summaryParts = [
    c.summary,
    "",
    `${emotionalEmoji[c.emotional_context] ?? ""} Contexto: ${c.emotional_context?.replace(/_/g, " ")}`,
    `${channelEmoji[c.recommended_channel] ?? ""} Contactar vía: ${c.recommended_channel?.replace(/_/g, " ")}`,
    `📋 Próximo paso: ${c.next_step}`,
    `⏱️ SLA: ${c.sla_hours}h máx. para primer contacto`,
    c.tags?.length ? `🏷️ ${c.tags.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const updates: Record<string, any> = {
    ai_summary: summaryParts,
    ai_classification: c,
    intent: c.intent,
  };

  // Update urgency — AI knows the funeral context
  if (!lead.urgency || lead.urgency === "normal" || lead.urgency === "immediate") {
    updates.urgency = c.suggested_urgency;
  }

  // Set estimated value
  if (!lead.estimated_value || lead.estimated_value === 0) {
    updates.estimated_value = c.estimated_value || 0;
  }

  return updates;
}

function computePriorityScore(lead: any): number {
  // If AI already computed a score, use it
  if (lead.ai_classification?.priority_score) {
    return lead.ai_classification.priority_score;
  }

  // Fallback scoring
  let score = 50;
  const urgency = lead.urgency ?? "normal";
  if (urgency === "immediate" || urgency === "inmediata") score += 40;
  else if (urgency === "normal") score += 10;
  else score -= 10; // previsión

  if (lead.pipeline_stage === "nuevo") score += 10;
  if ((lead.estimated_value ?? 0) > 1000000) score += 10;

  const hoursElapsed = (Date.now() - new Date(lead.created_at).getTime()) / 3600000;
  if (urgency === "immediate" && hoursElapsed > 2) score += 15; // overdue penalty = higher priority
  if (urgency === "normal" && hoursElapsed > 24) score += 10;

  return Math.min(100, Math.max(0, score));
}

async function logActivity(supabase: any, leadId: string, c: any) {
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    activity_type: "ai_classification",
    description: `IA clasificó: urgencia ${c.suggested_urgency}, intención ${c.intent}, prioridad ${c.priority_score}/100, SLA ${c.sla_hours}h`,
    metadata: c,
  });
}
