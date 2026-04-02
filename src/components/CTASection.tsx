import { Link } from "react-router-dom";
import { Phone, MessageCircle, FileText, Heart } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";

const CTASection = () => (
  <section className="relative py-24 overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0">
      <img
        src="/assets/images/otros/clouds.webp"
        alt=""
        className="w-full h-full object-cover"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-primary/85" />
    </div>

    <div className="relative z-10 container text-center text-primary-foreground">
      <p className="text-gold text-xs tracking-solemn uppercase mb-4">¿Cómo podemos ayudarle?</p>
      <h2 className="text-section font-playfair italic mb-4">
        Estamos aquí para acompañarle
      </h2>
      <p className="text-primary-foreground/60 max-w-2xl mx-auto mb-12">
        No importa la hora ni el día. Nuestro equipo está listo para brindarle orientación, contención y soluciones inmediatas.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <a
          href="tel:+56964333760"
          className="flex flex-col items-center gap-3 bg-primary-foreground/10 hover:bg-gold/20 border border-primary-foreground/10 hover:border-gold/30 rounded-lg p-6 transition-brand"
        >
          <Phone className="w-8 h-8 text-gold" />
          <span className="text-sm tracking-wide-brand uppercase">Solicitar ayuda inmediata</span>
        </a>
        <a
          href={buildWhatsAppUrl("Hola, me gustaría cotizar un servicio funerario. ¿Pueden orientarme?")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-3 bg-primary-foreground/10 hover:bg-gold/20 border border-primary-foreground/10 hover:border-gold/30 rounded-lg p-6 transition-brand"
        >
          <MessageCircle className="w-8 h-8 text-gold" />
          <span className="text-sm tracking-wide-brand uppercase">Cotizar por WhatsApp</span>
        </a>
        <Link
          to="/planes"
          className="flex flex-col items-center gap-3 bg-primary-foreground/10 hover:bg-gold/20 border border-primary-foreground/10 hover:border-gold/30 rounded-lg p-6 transition-brand"
        >
          <FileText className="w-8 h-8 text-gold" />
          <span className="text-sm tracking-wide-brand uppercase">Ver planes disponibles</span>
        </Link>
        <Link
          to="/memoriales"
          className="flex flex-col items-center gap-3 bg-primary-foreground/10 hover:bg-gold/20 border border-primary-foreground/10 hover:border-gold/30 rounded-lg p-6 transition-brand"
        >
          <Heart className="w-8 h-8 text-gold" />
          <span className="text-sm tracking-wide-brand uppercase">Dejar condolencias</span>
        </Link>
      </div>
    </div>
  </section>
);

export default CTASection;
