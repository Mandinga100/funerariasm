import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";
import { Phone, MessageCircle } from "lucide-react";

const AboutSection = () => (
  <section className="py-24 bg-background">
    <div className="container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Image */}
        <div className="relative">
          <div className="aspect-[4/3] rounded-lg overflow-hidden">
            <img
              src="/assets/images/otros/about.webp"
              alt="Nuestro equipo profesional"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {/* Accent element */}
          <div className="absolute -bottom-4 -right-4 w-32 h-32 border-2 border-gold/20 rounded-lg -z-10" />
        </div>

        {/* Content */}
        <div>
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Quiénes Somos</p>
          <h2 className="text-section font-playfair italic text-foreground mb-6">
            Más que un servicio, un compromiso humano
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            En Funeraria Santa Margarita entendemos que cada despedida es única. Por eso, 
            ofrecemos un acompañamiento personalizado que cuida cada detalle con sensibilidad, 
            respeto y la más alta calidad profesional.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Nuestro equipo de profesionales está disponible las 24 horas del día, los 365 días 
            del año, para brindar contención, orientación y soluciones integrales a cada familia 
            que confía en nosotros.
          </p>

          {/* Values */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { img: "/assets/images/otros/respeto.webp", label: "Respeto" },
              { img: "/assets/images/otros/empatia.webp", label: "Empatía" },
              { img: "/assets/images/otros/calidad.webp", label: "Calidad" },
              { img: "/assets/images/otros/profesional.webp", label: "Profesionalismo" },
            ].map((v) => (
              <div key={v.label} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50">
                <img src={v.img} alt={v.label} className="w-10 h-10 rounded object-cover" loading="lazy" />
                <span className="text-sm font-medium text-foreground">{v.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={buildWhatsAppUrlDirect("Hola, me gustaría conocer más sobre Funeraria Santa Margarita y sus servicios.")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-accent-foreground px-6 py-3 rounded-full text-sm tracking-wide-brand uppercase transition-brand"
            >
              <MessageCircle className="w-4 h-4" />
              Hablar con nosotros
            </a>
            <a
              href="tel:+56964333760"
              className="flex items-center gap-2 border border-foreground/20 hover:border-gold text-foreground hover:text-gold px-6 py-3 rounded-full text-sm tracking-wide-brand uppercase transition-brand"
            >
              <Phone className="w-4 h-4" />
              Llamar ahora
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default AboutSection;
