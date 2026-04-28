// Edge function: invite-team-member
// Crea un nuevo usuario (con o sin contraseña) y le asigna un rol,
// usando la service role key para no afectar la sesión del invitador.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole = "ceo" | "admin" | "moderator" | "family";

interface InviteBody {
  email: string;
  display_name?: string;
  role: AppRole;
  mode: "invite" | "manual";
  password?: string; // solo en modo manual
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
    const inviterId = userData.user.id;

    // 2. Validar rol del invocador (debe ser admin o ceo)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", inviterId);
    if (rolesErr) return jsonResponse({ error: rolesErr.message }, 500);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    const isCeo = roleSet.has("ceo");
    const isAdmin = roleSet.has("admin");
    if (!isCeo && !isAdmin) {
      return jsonResponse({ error: "Sin permisos" }, 403);
    }

    // 3. Validar payload
    let body: InviteBody;
    try {
      body = (await req.json()) as InviteBody;
    } catch {
      return jsonResponse({ error: "JSON inválido" }, 400);
    }
    const { email, display_name, role, mode, password } = body ?? {};
    if (!email || !role || !mode) {
      return jsonResponse({ error: "Faltan campos requeridos" }, 400);
    }
    const allowedRoles: AppRole[] = ["ceo", "admin", "moderator", "family"];
    if (!allowedRoles.includes(role)) {
      return jsonResponse({ error: "Rol inválido" }, 400);
    }
    // Solo CEO puede asignar CEO o admin
    if ((role === "ceo" || role === "admin") && !isCeo) {
      return jsonResponse(
        { error: "Solo el CEO puede asignar este rol" },
        403,
      );
    }
    if (mode === "manual" && (!password || password.length < 8)) {
      return jsonResponse(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        400,
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const meta = { display_name: display_name?.trim() || cleanEmail.split("@")[0] };

    // 4. Buscar si el usuario ya existe
    let userId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const existingUser = existing?.users.find(
      (u) => u.email?.toLowerCase() === cleanEmail,
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Crear usuario
      if (mode === "manual") {
        const { data: created, error: createErr } =
          await admin.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: false,
            user_metadata: meta,
          });
        if (createErr || !created.user) {
          return jsonResponse(
            { error: createErr?.message ?? "No se pudo crear el usuario" },
            400,
          );
        }
        userId = created.user.id;
      } else {
        // invite: crear sin contraseña y enviar magic link
        const { data: created, error: createErr } =
          await admin.auth.admin.createUser({
            email: cleanEmail,
            email_confirm: true, // confirmar para que el magic link funcione
            user_metadata: meta,
          });
        if (createErr || !created.user) {
          return jsonResponse(
            { error: createErr?.message ?? "No se pudo crear el usuario" },
            400,
          );
        }
        userId = created.user.id;
      }
    }

    if (!userId) {
      return jsonResponse({ error: "No se pudo determinar el usuario" }, 500);
    }

    // 5. Asignar rol (idempotente)
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id, role")
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (roleErr) {
        return jsonResponse(
          { error: `Usuario creado pero error al asignar rol: ${roleErr.message}` },
          500,
        );
      }
    }

    // 6. Si es invitación, generar magic link
    let magicLink: string | null = null;
    if (mode === "invite") {
      const { data: linkData, error: linkErr } =
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email: cleanEmail,
        });
      if (linkErr) {
        // No bloqueamos: el usuario quedó creado y con rol
        console.warn("generateLink error:", linkErr.message);
      } else {
        magicLink = linkData?.properties?.action_link ?? null;
      }
    }

    return jsonResponse({
      success: true,
      user_id: userId,
      already_existed: !!existingUser,
      magic_link: magicLink,
    });
  } catch (e) {
    console.error("invite-team-member error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Error inesperado" },
      500,
    );
  }
});
