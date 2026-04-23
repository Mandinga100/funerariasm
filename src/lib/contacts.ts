import { supabase } from "@/integrations/supabase/client";
import { ContactIntent, buildWhatsAppMessage } from "./whatsapp";
import { getComunaAttribution } from "./comuna-tracking";
import { validateFullName, validateChileanPhone, validateEmail } from "./lead-validation";

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
}

export const submitContact = async (data: ContactData) => {
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

  // 1. Persist to DB — auto-rellena comuna desde la landing si el formulario no la pidió.
  const insertPayload = {
    contact_type: data.contactType,
    name: data.name || null,
    email: data.email || null,
    phone: data.phone || null,
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
