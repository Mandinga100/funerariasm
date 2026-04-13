import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_HOURS = 48;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

    // Find open cases not updated in 48+ hours
    const { data: staleCases, error } = await supabase
      .from("service_cases")
      .select("id, case_number, client_name, pipeline_stage, payment_status, updated_at, urgency")
      .not("pipeline_stage", "in", '("cerrado","cancelado")')
      .lt("updated_at", cutoff);

    if (error) throw error;
    if (!staleCases?.length) {
      return new Response(JSON.stringify({ success: true, stale: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin users
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "ceo"]);

    if (!admins?.length) {
      return new Response(JSON.stringify({ success: true, stale: staleCases.length, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build notifications
    const urgent = staleCases.filter(c => c.urgency === "inmediata");
    const normal = staleCases.filter(c => c.urgency !== "inmediata");

    const title = `⏰ ${staleCases.length} caso${staleCases.length > 1 ? "s" : ""} sin movimiento (+${STALE_HOURS}h)`;

    const lines: string[] = [];
    if (urgent.length) {
      lines.push(`🔴 URGENTES (${urgent.length}):`);
      urgent.forEach(c => {
        const hours = Math.round((Date.now() - new Date(c.updated_at).getTime()) / 3600000);
        lines.push(`  • ${c.case_number} — ${c.client_name || "Sin nombre"} — ${c.pipeline_stage}/${c.payment_status} — ${hours}h estancado`);
      });
    }
    if (normal.length) {
      lines.push(`🟡 Otros (${normal.length}):`);
      normal.slice(0, 10).forEach(c => {
        const hours = Math.round((Date.now() - new Date(c.updated_at).getTime()) / 3600000);
        lines.push(`  • ${c.case_number} — ${c.client_name || "Sin nombre"} — ${c.pipeline_stage}/${c.payment_status} — ${hours}h`);
      });
      if (normal.length > 10) lines.push(`  ... y ${normal.length - 10} más`);
    }

    const notifications = admins.map(a => ({
      user_id: a.user_id,
      title,
      message: lines.join("\n"),
      type: urgent.length > 0 ? "warning" : "info",
      reference_type: "stale_cases",
    }));

    await supabase.from("admin_notifications").insert(notifications);

    return new Response(JSON.stringify({ success: true, stale: staleCases.length, notified: admins.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-stale-cases error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
