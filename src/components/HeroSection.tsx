import { Link } from "react-router-dom";
import { Phone, MessageCircle, ArrowDown } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";

const HeroSection = () => (
  <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0">
      <img
        src="/assets/images/ui/hero-bg.webp"
        alt="Espacio de paz y serenidad"
        className="w-full h-full object-cover"
        fetchPriority="high"
        loading="eager"
        decoding="async"
        width="1920"
        height="1080"
      />
      <div className="hero-overlay absolute inset-0" />
    </div>

    {/* Content */}
    <div className="relative z-10 container text-center text-primary-foreground px-4 pt-20 pb-32">
      <p
        className="text-gold text-xs tracking-solemn uppercase mb-6 animate-fade-in"
        style={{ animationDelay: "0.2s", opacity: 0 }}
      >
        Servicio funerario profesional 24/7
      </p>
      <h1
        className="text-hero font-playfair italic font-medium leading-tight mb-8 animate-fade-in-up"
        style={{ animationDelay: "0.4s", opacity: 0 }}
      >
        Acompañamos con{" "}
        <span className="text-gold-gradient">respeto y calidez</span>
        <br />
        en cada despedida
      </h1>
      <p
        className="text-body-responsive text-primary-foreground/70 max-w-2xl mx-auto mb-12 animate-fade-in-up"
        style={{ animationDelay: "0.6s", opacity: 0 }}
      >
        Funeraria Santa Margarita le brinda contención, guía profesional y acompañamiento integral
        para honrar la memoria de quienes amamos.
      </p>
      <div
        className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
        style={{ animationDelay: "0.8s", opacity: 0 }}
      >
        <a
          href="tel:+56964333760"
          className="group relative flex items-center gap-2 bg-gold hover:bg-gold-dark text-primary-foreground px-8 py-4 rounded-full text-sm tracking-wide-brand uppercase transition-brand font-medium overflow-hidden hover:shadow-[0_8px_30px_-6px_hsl(var(--gold)/0.4)]"
        >
          <Phone className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
          Solicitar ayuda inmediata
        </a>
        <a
          href={buildWhatsAppUrlDirect("Hola, necesito orientación sobre sus servicios funerarios. ¿Podrían asesorarme?")}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 border border-primary-foreground/20 hover:border-gold/40 text-primary-foreground px-8 py-4 rounded-full text-sm tracking-wide-brand uppercase transition-brand hover:shadow-[0_8px_30px_-6px_hsl(var(--gold)/0.15)]"
        >
          <MessageCircle className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
          Hablar por WhatsApp
        </a>
      </div>
      <Link
        to="/planes"
        className="inline-block mt-6 text-gold/60 hover:text-gold text-xs tracking-wide-brand uppercase transition-brand animate-fade-in group"
        style={{ animationDelay: "1s", opacity: 0 }}
      >
        Ver planes funerarios{" "}
        <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
      </Link>
    </div>

    {/* Scroll indicator */}
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse-soft">
      <ArrowDown className="w-5 h-5 text-primary-foreground/40" />
    </div>
  </section>
);

export default HeroSection;
