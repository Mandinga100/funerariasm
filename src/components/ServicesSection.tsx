import { Heart, Shield, Clock, Award, Users, Truck, Phone, MessageCircle } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";

const SERVICES = [
  {
    icon: Heart,
    title: "Ceremonias de Despedida",
    description: "Servicios funerarios completos con atención personalizada y contención emocional para cada familia.",
    image: "/assets/images/servicios/funerales-gala.webp",
  },
  {
    icon: Shield,
    title: "Cremación Profesional",
    description: "Servicio de cremación con los más altos estándares, incluyendo sala de despedida y urna ceremonial.",
    image: "/assets/images/servicios/crematorio.webp",
  },
  {
    icon: Truck,
    title: "Traslados Nacionales",
    description: "Coordinación integral de traslados terrestres y aéreos a cualquier punto del país.",
    image: "/assets/images/servicios/traslados.webp",
  },
  {
    icon: Users,
    title: "Asesoría Familiar",
    description: "Acompañamiento en trámites legales, certificados de defunción y coordinación con instituciones.",
    image: "/assets/images/servicios/asesoria.webp",
  },
  {
    icon: Award,
    title: "Arreglos Florales",
    description: "Diseños florales exclusivos para honrar la memoria de su ser querido con delicadeza.",
    image: "/assets/images/servicios/floristeria.webp",
  },
  {
    icon: Clock,
    title: "Atención 24/7",
    description: "Disponibles todos los días del año, a cualquier hora, para brindarle el apoyo que necesita.",
    image: "/assets/images/otros/24h.webp",
  },
];

const ServicesSection = () => {
  const headerRef = useScrollReveal();
  const gridRef = useStaggerReveal(120);

  return (
    <section id="servicios" className="py-24 bg-background">
      <div className="container">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Nuestros Servicios</p>
          <h2 className="text-section font-playfair italic text-foreground mb-4">
            Acompañamiento integral y profesional
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cada detalle importa. Ofrecemos un servicio completo para que usted pueda concentrarse en lo que realmente importa: despedirse con amor.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className="group bg-card rounded-lg overflow-hidden border border-border/50 hover:border-gold/30 transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-brand-slow"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <service.icon className="w-5 h-5 text-gold transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="font-playfair text-lg text-foreground">{service.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <p className="text-muted-foreground text-sm mb-6">
            ¿Necesita alguno de estos servicios? Estamos disponibles 24/7.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:+56964333760"
              className="group flex items-center gap-2 bg-gold hover:bg-gold-dark text-accent-foreground px-7 py-3.5 rounded-full text-sm tracking-wide-brand uppercase font-medium transition-brand hover:shadow-[0_8px_30px_-6px_hsl(var(--gold)/0.4)]"
            >
              <Phone className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-12" />
              Solicitar servicio ahora
            </a>
            <a
              href={buildWhatsAppUrlDirect("Hola, necesito información sobre sus servicios funerarios. ¿Pueden orientarme?")}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 border border-foreground/20 hover:border-gold text-foreground hover:text-gold px-7 py-3.5 rounded-full text-sm tracking-wide-brand uppercase transition-brand"
            >
              <MessageCircle className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
