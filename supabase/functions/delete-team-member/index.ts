// Edge function: delete-team-member
// Elimina por completo una cuenta del CRM (auth.users + roles + perfil),
// usando la service role key. Solo el CEO puede invocarla.
// Bloquea: borrar la propia cuenta o la del CEO fundador.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FOUNDER_USER_ID = "637e3028-414a-4c56-b4a0-6895cd152683";

interface DeleteBody {
  user_id: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verificar JWT del invocador
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "No autenticado" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Sesión inválida" }, 401);
    }
    const callerId = userData.user.id;

    // 2. Solo CEO puede eliminar cuentas completas
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isCeo = (callerRoles ?? []).some((r) => r.role === "ceo");
    if (!isCeo) {
      return jsonResponse(
        { error: "Solo el CEO puede eliminar cuentas completas" },
        403,
      );
    }

    // 3. Validar payload
    let body: DeleteBody;
    try {
      body = (await req.json()) as DeleteBody;
    } catch {
      return jsonResponse({ error: "JSON inválido" }, 400);
    }
    const targetId = body?.user_id;
    if (!targetId || typeof targetId !== "string") {
      return jsonResponse({ error: "user_id requerido" }, 400);
    }

    // 4. Bloqueos críticos
    if (targetId === callerId) {
      return jsonResponse(
        { error: "No puedes eliminar tu propia cuenta" },
        400,
      );
    }
    if (targetId === FOUNDER_USER_ID) {
      return jsonResponse(
        { error: "El CEO fundador es inamovible y no puede ser eliminado" },
        403,
      );
    }

    // 5. Eliminar registros relacionados (perfil + roles)
    //    user_roles tiene un trigger protect_founder_ceo que permite eliminar otros roles.
    await admin.from("user_roles").delete().eq("user_id", targetId);
    await admin.from("profiles").delete().eq("user_id", targetId);

    // 6. Eliminar la cuenta de auth (cascada: tokens, sesiones, etc.)
    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      return jsonResponse({ error: delErr.message }, 500);
    }

    return jsonResponse({ success: true });
  } catch (e) {
    console.error("delete-team-member error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Error inesperado" },
      500,
    );
  }
});
