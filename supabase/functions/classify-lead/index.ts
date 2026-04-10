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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId } = await req.json();
    if (!leadId) return new Response(JSON.stringify({ error: "leadId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from("contact_leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Eres un asistente CRM de una funeraria en Chile. Analiza el siguiente lead y proporciona:
1. Un resumen breve (2-3 líneas) del caso
2. Clasificación de urgencia sugerida: "inmediata" (fallecimiento reciente, necesita servicio ya), "normal" (consulta general), o "previsión" (planificación futura)
3. Intención del contacto: "servicio_funerario", "consulta_precios", "previsión_funeraria", "memorial", "otro"
4. Próximo paso recomendado

Datos del lead:
- Nombre: ${lead.name ?? "No proporcionado"}
- Teléfono: ${lead.phone ?? "No proporcionado"}
- Email: ${lead.email ?? "No proporcionado"}
- Tipo de contacto: ${lead.contact_type}
- Mensaje: ${lead.message ?? "Sin mensaje"}
- Fuente: ${lead.source ?? "Desconocida"}
- Plan seleccionado: ${lead.selected_plan ?? "Ninguno"}
- Comuna: ${lead.comuna ?? "No especificada"}
- Urgencia actual: ${lead.urgency ?? "No clasificada"}

Responde SOLO en formato JSON con estos campos:
{
  "summary": "resumen del caso",
  "suggested_urgency": "inmediata|normal|previsión",
  "intent": "servicio_funerario|consulta_precios|previsión_funeraria|memorial|otro",
  "next_step": "próximo paso recomendado",
  "estimated_value_range": "bajo|medio|alto"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Eres un asistente CRM especializado en servicios funerarios en Chile. Responde siempre en JSON válido." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_lead",
              description: "Classify and summarize a funeral home lead",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Brief 2-3 line case summary" },
                  suggested_urgency: { type: "string", enum: ["inmediata", "normal", "previsión"] },
                  intent: { type: "string", enum: ["servicio_funerario", "consulta_precios", "previsión_funeraria", "memorial", "otro"] },
                  next_step: { type: "string", description: "Recommended next action" },
                  estimated_value_range: { type: "string", enum: ["bajo", "medio", "alto"] },
                },
                required: ["summary", "suggested_urgency", "intent", "next_step", "estimated_value_range"],
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required for AI" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const classification = JSON.parse(toolCall.function.arguments);

    // Update lead with AI classification
    const valueMap: Record<string, number> = { bajo: 200000, medio: 800000, alto: 2000000 };
    const updates: Record<string, any> = {
      ai_summary: classification.summary + "\n\n📋 Próximo paso: " + classification.next_step,
      ai_classification: classification,
      intent: classification.intent,
    };

    // Only update urgency if not already set by human
    if (!lead.urgency || lead.urgency === "normal") {
      updates.urgency = classification.suggested_urgency;
    }

    // Set estimated value if not already set
    if (!lead.estimated_value || lead.estimated_value === 0) {
      updates.estimated_value = valueMap[classification.estimated_value_range] || 0;
    }

    await supabase.from("contact_leads").update(updates).eq("id", leadId);

    // Log activity
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      activity_type: "ai_classification",
      description: `IA clasificó: urgencia ${classification.suggested_urgency}, intención ${classification.intent}`,
      metadata: classification,
    });

    return new Response(JSON.stringify({ success: true, classification }), {
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
