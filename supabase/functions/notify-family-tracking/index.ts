// Notifica a la familia (WhatsApp + correo) cuando se publica un tracking.
// Se invoca desde el frontend tras detectar admin_notifications.reference_type='family_tracking'
// o manualmente desde el botón "Reenviar acceso" en CaseDetailSheet.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

interface Payload {
  tracking_id: string;
  channel?: "all" | "whatsapp" | "email";
}

const PUBLIC_BASE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://funerariasm.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body?.tracking_id) {
      return new Response(JSON.stringify({ error: "tracking_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const channel = body.channel ?? "all";

    const { data: ft, error: ftErr } = await supabase
      .from("family_tracking")
      .select("id, family_code, family_name, family_email, family_phone, family_phone_normalized, is_published, service_case_id")
      .eq("id", body.tracking_id)
      .maybeSingle();
    if (ftErr || !ft) {
      return new Response(JSON.stringify({ error: "tracking no encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ft.is_published) {
      return new Response(JSON.stringify({ error: "tracking no está publicado" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trackingUrl = `${PUBLIC_BASE_URL}/seguimiento?code=${encodeURIComponent(ft.family_code)}`;
    const sentChannels: string[] = [];

    // 1) WhatsApp (link wa.me que abre conversación con el ejecutivo o con la familia)
    if ((channel === "all" || channel === "whatsapp") && ft.family_phone_normalized) {
      // Generamos sólo el deep-link; el envío real lo hace el ejecutivo desde su WhatsApp
      // (no enviamos masivos). Devolvemos la URL wa.me para que el frontend pueda abrirla.
      sentChannels.push("whatsapp_link");
    }

    // 2) Correo: invocamos send-contact-email reutilizando el transport existente
    if ((channel === "all" || channel === "email") && ft.family_email) {
      try {
        const emailRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-contact-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to: ft.family_email,
            subject: `Acceso al seguimiento del servicio — Funeraria Santa Margarita`,
            html: emailTemplate(ft.family_name, ft.family_code, trackingUrl),
            internal: false,
          }),
        });
        if (emailRes.ok) sentChannels.push("email");
      } catch (e) {
        console.error("[notify-family-tracking] email error", e);
      }
    }

    // Audit
    await supabase.from("audit_logs").insert({
      user_id: u.user.id,
      user_email: u.user.email ?? null,
      module: "family_tracking",
      action: "notify",
      entity_type: "family_tracking",
      entity_id: ft.id,
      description: `Acceso enviado a familia (${sentChannels.join(", ") || "ningún canal"})`,
      new_data: { channels: sentChannels, code: ft.family_code },
    });

    return new Response(JSON.stringify({
      ok: true,
      tracking_url: trackingUrl,
      whatsapp_url: ft.family_phone_normalized
        ? `https://wa.me/${ft.family_phone_normalized.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
            `Hola ${ft.family_name}, le compartimos el acceso privado al seguimiento del servicio: ${trackingUrl} (código: ${ft.family_code}). Funeraria Santa Margarita está a su disposición 24/7.`,
          )}`
        : null,
      sent_channels: sentChannels,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[notify-family-tracking] fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function emailTemplate(name: string, code: string, url: string): string {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111;padding:24px">
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-style:italic;color:#111;margin:0 0 8px">Acceso al seguimiento del servicio</h1>
    <p style="margin:0 0 16px;color:#444">Estimada familia ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px;color:#444;line-height:1.55">
      Sabemos que cada minuto cuenta. Hemos preparado un espacio privado donde podrá consultar
      en tiempo real la etapa del servicio, los próximos pasos y los documentos pendientes.
    </p>
    <div style="background:#FAF8F4;border:1px solid #E9E2D2;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px;font-size:12px;color:#7a6c4f;letter-spacing:.08em;text-transform:uppercase">Su código privado</p>
      <p style="margin:0;font-size:22px;font-weight:600;letter-spacing:.18em">${escapeHtml(code)}</p>
    </div>
    <p style="margin:0 0 24px">
      <a href="${url}" style="display:inline-block;background:#000;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:500">Abrir seguimiento</a>
    </p>
    <p style="font-size:12px;color:#888;margin:32px 0 0;line-height:1.5">
      Este enlace es personal. Si necesita asistencia inmediata, escríbanos al WhatsApp +56 9 6433 3760.
      Funeraria Santa Margarita — acompañándolos 24/7.
    </p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
