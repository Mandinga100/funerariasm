import { supabase } from "@/integrations/supabase/client";
import { ContactIntent, buildWhatsAppMessage } from "./whatsapp";
import { getComunaAttribution } from "./comuna-tracking";
import { validateFullName, validateChileanPhone, validateEmail } from "./lead-validation";
import { checkBotShield, registerShieldHit } from "./bot-shield";

/** Error lanzado por las defensas anti-bot. Permite al UI reaccionar (ej. mostrar captcha). */
export class BotShieldError extends Error {
  reason: string;
  requiresChallenge: boolean;
  constructor(message: string, reason: string, requiresChallenge: boolean) {
    super(message);
    this.name = "BotShieldError";
    this.reason = reason;
    this.requiresChallenge = requiresChallenge;
  }
}

interface ContactData {
  contactType: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  intent?: ContactIntent;
  source?: string;
  comuna?: string;
  selectedPlan?: string;
  urgency?: "immediate" | "high" | "normal" | "cotizacion" | "prevision";
  /**
   * Si es true, se omiten validaciones estrictas (caso pre-lead anónimo
   * registrado al primer click del chatbox antes de pedir datos).
   */
  skipValidation?: boolean;
  /**
   * Timestamp (Date.now()) cuando el formulario fue cargado/abierto.
   * Si se provee, se aplica timing check + throttle por sesión.
   * Si se omite, solo se aplica throttle (chatbox no tiene timer claro).
   */
  formStartedAt?: number;
  /** Honeypot — debe venir vacío. */
  honeypot?: string;
}

export const submitContact = async (data: ContactData) => {
  // Defensa anti-bot opcional: solo se aplica cuando el caller envía
  // formStartedAt y/o honeypot (formularios tradicionales). El chatbox
  // omite estos campos y sigue funcionando como antes.
  if (data.formStartedAt !== undefined || data.honeypot !== undefined) {
    const shield = checkBotShield({
      honeypot: data.honeypot ?? "",
      startedAt: data.formStartedAt ?? Date.now(),
      formKey: `contact_${data.contactType}`,
    });
    if (!shield.ok) {
      throw new Error(shield.message ?? "Envío bloqueado por motivos de seguridad.");
    }
  }

  // Validación de defensa en profundidad: si vienen nombre/teléfono/email,
  // se exige que sean reales. Esto bloquea bots y formularios mal armados
  // antes de tocar la base de datos. El chatbox ya valida paso a paso,
  // pero los formularios tradicionales también pasan por aquí.
  if (!data.skipValidation) {
    if (data.name) {
      const r = validateFullName(data.name);
      if (!r.ok) throw new Error(r.error);
      data.name = r.value;
    }
    if (data.phone) {
      const r = validateChileanPhone(data.phone);
      if (!r.ok) throw new Error(r.error);
      data.phone = r.value;
    }
    if (data.email) {
      const r = validateEmail(data.email, { required: false });
      if (!r.ok) throw new Error(r.error);
      data.email = r.value;
    }
  }

  const whatsappMessage = buildWhatsAppMessage({
    intent: data.intent || "general",
    name: data.name,
    phone: data.phone,
    email: data.email,
    comuna: data.comuna,
    selectedPlan: data.selectedPlan,
    details: data.message,
  });

  // Atribución de origen: si el visitante pasó por /funeraria/:comuna,
  // se vincula automáticamente para medir conversión real desde landing hasta venta.
  const attribution = getComunaAttribution();
  const metadata: Record<string, unknown> = {};
  if (attribution) {
    metadata.comuna_attribution = attribution;
    metadata.attribution_source = "comuna_landing";
  }

  // 1. Deduplicación inteligente — evita registrar el mismo lead dos veces si
  // el visitante reenvía el formulario o el chatbox se reabre en sesiones cercanas.
  // Ventana: últimas 6 horas. Match por teléfono O email normalizados.
  // Si hay duplicado: agrega una actividad al lead existente y devuelve sin crear uno nuevo.
  const DEDUPE_WINDOW_HOURS = 6;
  const sinceIso = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const phoneNorm = data.phone?.trim() || null;
  const emailNorm = data.email?.trim().toLowerCase() || null;

  let duplicateLeadId: string | null = null;
  if (phoneNorm || emailNorm) {
    try {
      const orFilters: string[] = [];
      if (phoneNorm) orFilters.push(`phone.eq.${phoneNorm}`);
      if (emailNorm) orFilters.push(`email.eq.${emailNorm}`);

      const { data: recent } = await (supabase
        .from("contact_leads")
        .select("id, created_at, urgency, pipeline_stage")
        .gte("created_at", sinceIso)
        .or(orFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(1) as any);

      if (recent && recent.length > 0) {
        duplicateLeadId = recent[0].id as string;
      }
    } catch (dedupeError) {
      // Si la búsqueda falla, no bloqueamos el flujo: mejor un lead extra que perderlo.
      console.warn("Dedupe lookup failed, continuing with insert:", dedupeError);
    }
  }

  if (duplicateLeadId) {
    // Re-contacto: anotamos actividad en el lead existente y salimos.
    try {
      await (supabase.from("lead_activities").insert as any)({
        lead_id: duplicateLeadId,
        activity_type: "duplicate_contact",
        description: `Re-contacto detectado (${data.contactType}). Mensaje: ${(data.message || "—").slice(0, 200)}`,
        metadata: {
          contact_type: data.contactType,
          source: data.source || "web",
          urgency: data.urgency || "normal",
          selected_plan: data.selectedPlan || null,
          window_hours: DEDUPE_WINDOW_HOURS,
        },
      });
    } catch (activityError) {
      console.warn("Could not log duplicate activity (non-blocking):", activityError);
    }
    return { success: true, whatsappMessage, deduplicated: true, leadId: duplicateLeadId };
  }

  // 2. Persist to DB — auto-rellena comuna desde la landing si el formulario no la pidió.
  const insertPayload = {
    contact_type: data.contactType,
    name: data.name || null,
    email: emailNorm,
    phone: phoneNorm,
    message: data.message || null,
    intent: data.intent || null,
    source: data.source || "web",
    comuna: data.comuna || attribution?.comuna_nombre || null,
    selected_plan: data.selectedPlan || null,
    urgency: data.urgency || "normal",
    whatsapp_message: whatsappMessage,
    status: "new",
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
  const { error: dbError } = await (supabase.from("contact_leads").insert as any)(insertPayload);

  if (dbError) {
    console.error("Error saving contact lead:", dbError);
    throw new Error("No se pudo registrar el contacto");
  }

  // Registra el hit en el throttle por sesión solo si vino con shield activo
  if (data.formStartedAt !== undefined || data.honeypot !== undefined) {
    registerShieldHit(`contact_${data.contactType}`);
  }

  // 2. Send email copy via edge function
  try {
    await supabase.functions.invoke("send-contact-email", {
      body: {
        contactType: data.contactType,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        intent: data.intent,
        source: data.source,
        selectedPlan: data.selectedPlan,
        urgency: data.urgency,
        comuna: data.comuna || attribution?.comuna_nombre,
        comunaAttribution: attribution,
      },
    });
  } catch (emailError) {
    console.error("Email notification failed (non-blocking):", emailError);
  }

  return { success: true, whatsappMessage };
};
