import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Phone, MessageCircle, MapPin, Clock, Mail } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";

const Contacto = () => (
  <Layout>
    {/* Hero */}
    <section className="pt-28 pb-16 bg-primary text-primary-foreground">
      <div className="container text-center">
        <p className="text-gold text-xs tracking-solemn uppercase mb-4">Contacto</p>
        <h1 className="text-section font-playfair italic mb-4">Estamos aquí para acompañarle</h1>
        <p className="text-primary-foreground/60 max-w-xl mx-auto">
          No importa la hora ni el día. Comuníquese con nosotros y recibirá atención profesional e inmediata.
        </p>
      </div>
    </section>

    {/* Quick actions */}
    <section className="py-12 bg-soft-gray">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <a
            href="tel:+56964333760"
            className="flex items-center gap-3 bg-background border border-border rounded-xl p-5 hover:border-gold/30 transition-brand"
          >
            <Phone className="w-8 h-8 text-gold shrink-0" />
            <div>
              <p className="font-medium text-sm text-foreground">Llamar ahora</p>
              <p className="text-xs text-muted-foreground">+56 9 6433 3760</p>
            </div>
          </a>
          <a
            href={buildWhatsAppUrlDirect("Hola, me comunico desde su sitio web. Necesito información.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-background border border-border rounded-xl p-5 hover:border-gold/30 transition-brand"
          >
            <MessageCircle className="w-8 h-8 text-[#25D366] shrink-0" />
            <div>
              <p className="font-medium text-sm text-foreground">WhatsApp 24/7</p>
              <p className="text-xs text-muted-foreground">Respuesta inmediata</p>
            </div>
          </a>
          <a
            href="mailto:funerariasantamargarita2026@gmail.com"
            className="flex items-center gap-3 bg-background border border-border rounded-xl p-5 hover:border-gold/30 transition-brand"
          >
            <Mail className="w-8 h-8 text-gold shrink-0" />
            <div>
              <p className="font-medium text-sm text-foreground">Email</p>
              <p className="text-xs text-muted-foreground break-all">funerariasm@gmail.com</p>
            </div>
          </a>
        </div>
      </div>
    </section>

    {/* Form */}
    <section className="py-16 bg-background">
      <div className="container max-w-2xl">
        <ContactForm type="general" source="pagina-contacto" />
      </div>
    </section>

    {/* Info */}
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-3">
            <Clock className="w-8 h-8 text-gold mx-auto" />
            <h3 className="font-playfair text-lg">Atención 24/7</h3>
            <p className="text-sm text-primary-foreground/60">
              Disponibles los 365 días del año, a cualquier hora.
            </p>
          </div>
          <div className="space-y-3">
            <MapPin className="w-8 h-8 text-gold mx-auto" />
            <h3 className="font-playfair text-lg">Santiago, Chile</h3>
            <p className="text-sm text-primary-foreground/60">
              Cobertura en toda la Región Metropolitana y traslados nacionales.
            </p>
          </div>
          <div className="space-y-3">
            <Phone className="w-8 h-8 text-gold mx-auto" />
            <h3 className="font-playfair text-lg">Respuesta inmediata</h3>
            <p className="text-sm text-primary-foreground/60">
              Nuestro equipo responde en minutos para situaciones de urgencia.
            </p>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default Contacto;
