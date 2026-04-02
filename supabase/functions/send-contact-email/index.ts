import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contactType, name, email, phone, message, intent, source, selectedPlan, urgency, comuna } = await req.json();

    if (!contactType) {
      return new Response(JSON.stringify({ error: "contactType is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RECIPIENT = "funerariasantamargarita2026@gmail.com";
    
    const urgencyLabels: Record<string, string> = {
      immediate: "🔴 URGENTE — Fallecimiento reciente",
      high: "🟠 Alta — Necesita atención pronto",
      normal: "🟢 Normal",
    };

    const subject = `[Funeraria SM] ${urgencyLabels[urgency] || "Nuevo contacto"} — ${contactType}`;
    
    const bodyLines = [
      `Nuevo contacto desde el sitio web`,
      ``,
      `Tipo: ${contactType}`,
      name ? `Nombre: ${name}` : null,
      email ? `Email: ${email}` : null,
      phone ? `Teléfono: ${phone}` : null,
      comuna ? `Comuna: ${comuna}` : null,
      selectedPlan ? `Plan seleccionado: ${selectedPlan}` : null,
      intent ? `Intención: ${intent}` : null,
      source ? `Origen: ${source}` : null,
      message ? `\nMensaje:\n${message}` : null,
      ``,
      `Fecha: ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}`,
    ].filter(Boolean).join("\n");

    // Use Lovable AI to format a professional email HTML
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ success: true, emailSent: false, reason: "No API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now, log the contact and return success
    // Email sending will be enabled when email domain is configured
    console.log(`📧 Contact lead received:`, { contactType, name, email, phone, urgency, source });
    console.log(`📧 Would send to: ${RECIPIENT}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Body:\n${bodyLines}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Contacto registrado correctamente" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-contact-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
