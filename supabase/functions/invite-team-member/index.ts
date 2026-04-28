// Edge function: invite-team-member
// Modo "invite": registra una invitación pendiente (correo + rol). El usuario debe
//   ir al login del CRM y crear su propia contraseña; al registrarse recibe el rol.
// Modo "manual": el CEO/admin crea el usuario con correo + contraseña + rol asignado.
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
    const cleanName = display_name?.trim() || cleanEmail.split("@")[0];

    // ─────────────── MODO INVITE: solo registrar invitación pendiente ───────────────
    if (mode === "invite") {
      // ¿Ya existe usuario con este correo?
      const { data: existing } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const existingUser = existing?.users.find(
        (u) => u.email?.toLowerCase() === cleanEmail,
      );
      if (existingUser) {
        // Ya existe: simplemente asignar el rol directamente
        const { data: existingRole } = await admin
          .from("user_roles")
          .select("id")
          .eq("user_id", existingUser.id)
          .eq("role", role)
          .maybeSingle();
        if (!existingRole) {
          const { error: roleErr } = await admin
            .from("user_roles")
            .insert({ user_id: existingUser.id, role });
          if (roleErr) {
            return jsonResponse({ error: roleErr.message }, 500);
          }
        }
        return jsonResponse({
          success: true,
          mode: "invite",
          already_existed: true,
          message: "El usuario ya existía. Se le asignó el rol directamente.",
        });
      }

      // Revocar invitaciones pendientes previas para este correo
      await admin
        .from("pending_invitations")
        .update({ status: "revoked", updated_at: new Date().toISOString() })
        .eq("status", "pending")
        .ilike("email", cleanEmail);

      // Crear nueva invitación pendiente
      const { error: invErr } = await admin.from("pending_invitations").insert({
        email: cleanEmail,
        display_name: cleanName,
        role,
        invited_by: inviterId,
      });
      if (invErr) {
        return jsonResponse({ error: invErr.message }, 500);
      }

      return jsonResponse({
        success: true,
        mode: "invite",
        already_existed: false,
        message:
          "Invitación registrada. La persona debe ir al login del CRM y crear su cuenta con este correo.",
      });
    }

    // ─────────────── MODO MANUAL: crear usuario con contraseña asignada ───────────────
    const { data: existing } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const existingUser = existing?.users.find(
      (u) => u.email?.toLowerCase() === cleanEmail,
    );
    if (existingUser) {
      return jsonResponse(
        { error: "Ya existe un usuario con ese correo" },
        409,
      );
    }

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true, // confirmado: el CEO ya validó el correo
        user_metadata: { display_name: cleanName },
      });
    if (createErr || !created.user) {
      return jsonResponse(
        { error: createErr?.message ?? "No se pudo crear el usuario" },
        400,
      );
    }
    const userId = created.user.id;

    // Asignar rol
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
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

    return jsonResponse({
      success: true,
      mode: "manual",
      user_id: userId,
      message: "Usuario creado correctamente. Ya puede iniciar sesión con la contraseña asignada.",
    });
  } catch (e) {
    console.error("invite-team-member error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Error inesperado" },
      500,
    );
  }
});
