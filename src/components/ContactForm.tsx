import { useState, forwardRef } from "react";
import { Send, Phone, MessageCircle, CheckCircle, Loader2 } from "lucide-react";
import { submitContact } from "@/lib/contacts";
import { buildWhatsAppUrl, type ContactIntent } from "@/lib/whatsapp";

type FormType = "general" | "urgencia" | "cotizacion" | "planificacion";

interface ContactFormProps {
  type?: FormType;
  intent?: ContactIntent;
  selectedPlan?: string;
  source?: string;
  onSuccess?: () => void;
}

const FORM_CONFIG: Record<FormType, { title: string; subtitle: string; urgency: "immediate" | "high" | "normal" }> = {
  general: {
    title: "Contáctenos",
    subtitle: "Complete el formulario y le responderemos a la brevedad.",
    urgency: "normal",
  },
  urgencia: {
    title: "Solicitar ayuda inmediata",
    subtitle: "Nuestro equipo le contactará de inmediato. También puede llamarnos directamente.",
    urgency: "immediate",
  },
  cotizacion: {
    title: "Solicitar cotización",
    subtitle: "Cuéntenos qué necesita y le enviaremos una propuesta personalizada.",
    urgency: "normal",
  },
  planificacion: {
    title: "Agendar asesoría de planificación",
    subtitle: "Planifique con tranquilidad. Le contactaremos para una asesoría sin compromiso.",
    urgency: "normal",
  },
};

const ContactForm = ({
  type = "general",
  intent,
  selectedPlan,
  source = "web",
  onSuccess,
}: ContactFormProps, ref: React.Ref<HTMLDivElement>) => {
  const config = FORM_CONFIG[type];
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    comuna: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [whatsappMsg, setWhatsappMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || (!form.email.trim() && !form.phone.trim())) return;

    setStatus("loading");
    try {
      const result = await submitContact({
        contactType: type,
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
        intent: intent || (type === "urgencia" ? "fallecimiento" : type === "cotizacion" ? "cotizacion" : "general"),
        source,
        comuna: form.comuna,
        selectedPlan,
        urgency: config.urgency,
      });
      setWhatsappMsg(result.whatsappMessage);
      setStatus("success");
      onSuccess?.();
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center py-8 space-y-4">
        <CheckCircle className="w-12 h-12 text-gold mx-auto" />
        <h3 className="font-playfair text-xl text-foreground">Mensaje recibido</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Hemos registrado su solicitud. Nuestro equipo le contactará a la brevedad.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <a
            href={`https://wa.me/56964333760?text=${encodeURIComponent(whatsappMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-primary-foreground px-6 py-3 rounded-full text-sm font-medium transition-brand"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar también por WhatsApp
          </a>
          <a
            href="tel:+56964333760"
            className="flex items-center justify-center gap-2 border border-foreground/20 hover:border-gold text-foreground hover:text-gold px-6 py-3 rounded-full text-sm transition-brand"
          >
            <Phone className="w-4 h-4" />
            Llamar directamente
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-playfair text-xl text-foreground mb-1">{config.title}</h3>
        <p className="text-sm text-muted-foreground">{config.subtitle}</p>
      </div>

      {type === "urgencia" && (
        <div className="bg-[#8B0000]/10 border border-[#8B0000]/20 rounded-lg p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <a
            href="tel:+56964333760"
            className="flex items-center justify-center gap-2 bg-[#8B0000] text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium transition-brand hover:bg-[#6B0000]"
          >
            <Phone className="w-4 h-4" />
            Llamar ahora (24/7)
          </a>
          <a
            href={buildWhatsAppUrl({ intent: "fallecimiento" })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium transition-brand hover:bg-[#128C7E]"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp urgente
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide-brand mb-1 block">
              Nombre *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-soft-gray border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-brand"
              placeholder="Su nombre completo"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide-brand mb-1 block">
              Teléfono *
            </label>
            <input
              type="tel"
              required
              maxLength={20}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-soft-gray border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-brand"
              placeholder="+56 9 1234 5678"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide-brand mb-1 block">
              Email
            </label>
            <input
              type="email"
              maxLength={255}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-soft-gray border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-brand"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide-brand mb-1 block">
              Comuna
            </label>
            <input
              type="text"
              maxLength={100}
              value={form.comuna}
              onChange={(e) => setForm({ ...form, comuna: e.target.value })}
              className="w-full bg-soft-gray border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-brand"
              placeholder="Ej: Providencia"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide-brand mb-1 block">
            Mensaje
          </label>
          <textarea
            maxLength={1000}
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full bg-soft-gray border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-brand resize-none"
            placeholder="Cuéntenos cómo podemos ayudarle..."
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-destructive">
            Hubo un error al enviar su mensaje. Por favor intente nuevamente o contáctenos directamente.
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading" || !form.name.trim() || !form.phone.trim()}
          className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-accent-foreground py-3 rounded-full text-sm tracking-wide-brand uppercase font-medium transition-brand disabled:opacity-50"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {status === "loading" ? "Enviando..." : "Enviar mensaje"}
        </button>
      </form>
    </div>
  );
};

const ContactFormWithRef = forwardRef<HTMLDivElement, ContactFormProps>(ContactForm);
export default ContactFormWithRef;
