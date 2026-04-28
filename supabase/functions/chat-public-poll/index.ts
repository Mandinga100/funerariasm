// Public chat poll: returns messages + conversation state for a given token.
// Used by the website chatbox to sync in real time with the CRM (operator
// take-over, admin replies, status changes) without exposing RLS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  conversation_token: string;
  /** ISO timestamp — only return messages strictly after this. */
  since?: string;
  /** Mark visitor as having read everything up to now. */
  mark_read?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body.conversation_token || body.conversation_token.length < 8) {
      return new Response(JSON.stringify({ error: "missing_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: convo } = await supabase
      .from("chat_conversations")
      .select("id, status, assigned_to, priority, visitor_name, last_message_at, closed_at")
      .eq("conversation_token", body.conversation_token)
      .maybeSingle();

    if (!convo) {
      return new Response(
        JSON.stringify({ ok: true, exists: false, messages: [], status: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let operatorName: string | null = null;
    let operatorAvatarPath: string | null = null;
    let operatorGender: string | null = null;
    let operatorAvatarSigned: string | null = null;
    if (convo.assigned_to) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, gender")
        .eq("user_id", convo.assigned_to)
        .maybeSingle();
      operatorName = prof?.display_name?.toString().trim() || "Asesor";
      operatorAvatarPath = (prof?.avatar_url as string | null) || null;
      operatorGender = (prof?.gender as string | null) || null;
      // Firmar la URL del avatar (bucket privado) si existe.
      if (operatorAvatarPath) {
        const marker = "/avatars/";
        const idx = operatorAvatarPath.indexOf(marker);
        const path = idx !== -1
          ? operatorAvatarPath.substring(idx + marker.length).split("?")[0]
          : operatorAvatarPath;
        try {
          const { data: signed } = await supabase.storage
            .from("avatars")
            .createSignedUrl(path, 3600);
          if (signed?.signedUrl) operatorAvatarSigned = signed.signedUrl;
        } catch { /* noop */ }
      }
    }

    // Hidratación inicial (sin `since`): devolvemos TODO el historial visible
    // al visitante (incluyendo sus propios mensajes) para que al reabrir el
    // chat tras un cierre/recarga vea la conversación completa, no solo el
    // greeting + último lote.
    // Polling incremental (`since`): solo mensajes inbound nuevos (admin/system/
    // bot), porque los del visitante ya están reflejados en la UI.
    const isHydration = !body.since;
    let query = supabase
      .from("chat_messages")
      .select("id, sender_type, content, created_at, is_internal_note")
      .eq("conversation_id", convo.id)
      .eq("is_internal_note", false)
      .order("created_at", { ascending: true })
      .limit(isHydration ? 200 : 50);

    if (isHydration) {
      query = query.in("sender_type", ["visitor", "admin", "system", "bot"]);
    } else {
      query = query.in("sender_type", ["admin", "system", "bot"]).gt("created_at", body.since!);
    }

    const { data: messages } = await query;

    if (body.mark_read && messages && messages.length > 0) {
      await supabase
        .from("chat_conversations")
        .update({ unread_visitor: 0 })
        .eq("id", convo.id);
      // Solo marcamos como leídos los mensajes inbound (admin/system/bot).
      const inboundIds = messages
        .filter((m) => m.sender_type !== "visitor")
        .map((m) => m.id);
      if (inboundIds.length > 0) {
        await supabase
          .from("chat_messages")
          .update({ read_by_visitor_at: new Date().toISOString() })
          .in("id", inboundIds);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        exists: true,
        conversation_id: convo.id,
        status: convo.status,
        priority: convo.priority,
        operator_name: operatorName,
        operator_avatar_url: operatorAvatarSigned,
        operator_gender: operatorGender,
        operator_user_id: convo.assigned_to ?? null,
        operator_active: !!convo.assigned_to && convo.status === "humano_activo",
        closed: convo.status === "cerrado" || !!convo.closed_at,
        hydration: isHydration,
        messages: messages ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("chat-public-poll error", err);
    return new Response(JSON.stringify({ error: "internal", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
