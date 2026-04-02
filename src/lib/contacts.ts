import { supabase } from "@/integrations/supabase/client";
import { ContactIntent, buildWhatsAppMessage } from "./whatsapp";

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
  urgency?: "immediate" | "high" | "normal";
}

export const submitContact = async (data: ContactData) => {
  const whatsappMessage = buildWhatsAppMessage({
    intent: data.intent || "general",
    name: data.name,
    phone: data.phone,
    email: data.email,
    comuna: data.comuna,
    selectedPlan: data.selectedPlan,
    details: data.message,
  });

  // 1. Persist to DB
  const { error: dbError } = await supabase.from("contact_leads").insert({
    contact_type: data.contactType,
    name: data.name || null,
    email: data.email || null,
    phone: data.phone || null,
    message: data.message || null,
    intent: data.intent || null,
    source: data.source || "web",
    comuna: data.comuna || null,
    selected_plan: data.selectedPlan || null,
    urgency: data.urgency || "normal",
    whatsapp_message: whatsappMessage,
    status: "new",
  });

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
        comuna: data.comuna,
      },
    });
  } catch (emailError) {
    console.error("Email notification failed (non-blocking):", emailError);
  }

  return { success: true, whatsappMessage };
};
