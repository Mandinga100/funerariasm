import { Phone, MessageCircle, Mail, Clock, MapPin } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";
import ContactForm from "./ContactForm";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const ContactoSection = () => {
  const headerRef = useScrollReveal();
  const formRef = useScrollReveal(0.1, "0px 0px -40px 0px");

  return (
    <section id="contacto" className="py-24 bg-background">
      <div className="container">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Contáctenos</p>
          <h2 className="text-section font-playfair italic text-foreground mb-4">
            Estamos Contigo
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Nuestro equipo aguarda para brindarle contención inmediata. Asesoría personalizada 24/7.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
          <a
            href="tel:+56964333760"
            className="group flex items-center gap-3 bg-card border border-border/50 rounded-xl p-5 hover:border-gold/30 transition-brand"
          >
            <Phone className="w-8 h-8 text-gold shrink-0 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
            <div>
              <p className="font-medium text-sm text-foreground">Llamar ahora</p>
              <p className="text-xs text-muted-foreground">+56 9 6433 3760</p>
            </div>
          </a>
          <a
            href={buildWhatsAppUrlDirect("Hola, me comunico desde su sitio web. Necesito información.")}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-card border border-border/50 rounded-xl p-5 hover:border-gold/30 transition-brand"
          >
            <MessageCircle className="w-8 h-8 text-gold shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <div>
              <p className="font-medium text-sm text-foreground">WhatsApp 24/7</p>
              <p className="text-xs text-muted-foreground">Respuesta inmediata</p>
            </div>
          </a>
          <a
            href="mailto:funerariasantamargarita2026@gmail.com"
            className="group flex items-center gap-3 bg-card border border-border/50 rounded-xl p-5 hover:border-gold/30 transition-brand"
          >
            <Mail className="w-8 h-8 text-gold shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <div>
              <p className="font-medium text-sm text-foreground">Email</p>
              <p className="text-xs text-muted-foreground break-all">funerariasm@gmail.com</p>
            </div>
          </a>
        </div>

        {/* Form */}
        <div ref={formRef} className="max-w-2xl mx-auto">
          <ContactForm type="general" source="homepage-contacto" />
        </div>

        {/* Info bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mt-16 pt-16 border-t border-border/50">
          <div className="space-y-2">
            <Clock className="w-6 h-6 text-gold mx-auto" />
            <h3 className="font-playfair text-base text-foreground">Atención 24/7</h3>
            <p className="text-xs text-muted-foreground">Disponibles los 365 días del año</p>
          </div>
          <div className="space-y-2">
            <MapPin className="w-6 h-6 text-gold mx-auto" />
            <h3 className="font-playfair text-base text-foreground">Santiago, Chile</h3>
            <p className="text-xs text-muted-foreground">Cobertura en toda la RM</p>
          </div>
          <div className="space-y-2">
            <Phone className="w-6 h-6 text-gold mx-auto" />
            <h3 className="font-playfair text-base text-foreground">Respuesta inmediata</h3>
            <p className="text-xs text-muted-foreground">En minutos para urgencias</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactoSection;
