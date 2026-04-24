// Public chat endpoint: persists visitor messages, calls bot, triggers handoff.
// Verify JWT disabled — uses bot-shield (honeypot/timing) instead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HANDOFF_KEYWORDS = [
  "asesor", "humano", "persona", "ejecutivo", "alguien real",
  "hablar con", "necesito ayuda urgente", "fallecio", "falleció",
  "murio", "murió", "acaba de morir", "acaba de fallecer",
];

const SLA_MIN: Record<string, number> = {
  urgente: 15,
  alta: 60,
  normal: 240,
  baja: 1440,
};

interface Body {
  conversation_token: string;
  content: string;
  visitor_name?: string;
  visitor_phone?: string;
  visitor_email?: string;
  request_human?: boolean;
  // Bot-shield
  hp?: string;
  loaded_at?: number;
  source_path?: string;
}

function detectPriority(text: string, request_human: boolean): { priority: string; needs_handoff: boolean } {
  const lower = text.toLowerCase();
  const urgentMatch = /(falleci|muri|acaba de morir|emergenc|urgente)/i.test(lower);
  const handoffMatch = HANDOFF_KEYWORDS.some((k) => lower.includes(k));
  if (urgentMatch) return { priority: "urgente", needs_handoff: true };
  if (request_human || handoffMatch) return { priority: "alta", needs_handoff: true };
  return { priority: "normal", needs_handoff: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;

    // Bot-shield: solo honeypot. El timing no aplica al chat porque el usuario
    // puede legítimamente hacer click en una opción del menú al instante.
    if (body.hp && body.hp.length > 0) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.conversation_token || !body.content || body.content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.content.length > 4000) {
      return new Response(JSON.stringify({ error: "content_too_long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Detectar prioridad y handoff
    const { priority, needs_handoff } = detectPriority(body.content, !!body.request_human);

    // Upsert conversación por token
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("id, status, priority, assigned_to, lead_id, service_case_id, visitor_name, visitor_phone, visitor_email")
      .eq("conversation_token", body.conversation_token)
      .maybeSingle();

    let conversationId: string;
    let currentStatus: string;
    let finalPriority = priority;

    if (!existing) {
      // Mantener prioridad detectada
      const slaMinutes = SLA_MIN[finalPriority] ?? 240;
      const slaDue = new Date(Date.now() + slaMinutes * 60_000).toISOString();
      const initialStatus = needs_handoff ? "pendiente_humano" : "bot";

      const { data: created, error: insErr } = await supabase
        .from("chat_conversations")
        .insert({
          conversation_token: body.conversation_token,
          visitor_name: body.visitor_name ?? null,
          visitor_phone: body.visitor_phone ?? null,
          visitor_email: body.visitor_email ?? null,
          channel: "web",
          status: initialStatus,
          priority: finalPriority,
          sla_due_at: slaDue,
          metadata: { source_path: body.source_path ?? null },
        })
        .select("id, status")
        .single();

      if (insErr || !created) {
        return new Response(JSON.stringify({ error: "create_failed", detail: insErr?.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      conversationId = created.id;
      currentStatus = created.status;
    } else {
      conversationId = existing.id;
      currentStatus = existing.status;
      // Actualizar datos visitante si llegaron nuevos (siempre que vengan distintos
      // a los ya guardados, para reflejar en tiempo real cualquier cambio que el
      // visitante introduzca durante la conversación).
      const updates: Record<string, unknown> = {};
      if (body.visitor_name && body.visitor_name !== existing.visitor_name) {
        updates.visitor_name = body.visitor_name;
      }
      if (body.visitor_phone && body.visitor_phone !== (existing as { visitor_phone?: string }).visitor_phone) {
        updates.visitor_phone = body.visitor_phone;
      }
      if (body.visitor_email && body.visitor_email !== (existing as { visitor_email?: string }).visitor_email) {
        updates.visitor_email = body.visitor_email;
      }

      // Si keywords detectaron mayor prioridad o pidió humano explícitamente
      if (needs_handoff && currentStatus === "bot") {
        updates.status = "pendiente_humano";
        updates.priority = finalPriority;
        const slaMinutes = SLA_MIN[finalPriority] ?? 240;
        updates.sla_due_at = new Date(Date.now() + slaMinutes * 60_000).toISOString();
        currentStatus = "pendiente_humano";
      } else if (priority === "urgente" && existing.priority !== "urgente") {
        updates.priority = "urgente";
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("chat_conversations").update(updates).eq("id", conversationId);
      }
    }

    // Insertar mensaje del visitante
    const { error: msgErr } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      content: body.content.trim(),
    });

    if (msgErr) {
      return new Response(JSON.stringify({ error: "msg_insert_failed", detail: msgErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Si la convo sigue en modo bot → llamar al bot existente
    let botReply: string | null = null;
    if (currentStatus === "bot") {
      try {
        const botRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/chat-funerario`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: body.content }],
              stream: false,
            }),
          }
        );
        if (botRes.ok) {
          const botData = await botRes.json().catch(() => null);
          botReply = botData?.reply ?? botData?.message ?? botData?.content ?? null;
        }
      } catch (_e) {
        // Bot falló → cae a handoff
        botReply = null;
      }

      if (botReply) {
        await supabase.from("chat_messages").insert({
          conversation_id: conversationId,
          sender_type: "bot",
          content: botReply,
        });
      } else {
        // Sin respuesta del bot → escalamos a humano
        await supabase
          .from("chat_conversations")
          .update({ status: "pendiente_humano" })
          .eq("id", conversationId);
        currentStatus = "pendiente_humano";
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        conversation_id: conversationId,
        status: currentStatus,
        bot_reply: botReply,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("chat-public-send error", err);
    return new Response(JSON.stringify({ error: "internal", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
