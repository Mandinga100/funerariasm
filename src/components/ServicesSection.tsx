import { Heart, Shield, Clock, Award, Users, Truck } from "lucide-react";

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

const ServicesSection = () => (
  <section className="py-24 bg-background">
    <div className="container">
      <div className="text-center mb-16">
        <p className="text-gold text-xs tracking-solemn uppercase mb-4">Nuestros Servicios</p>
        <h2 className="text-section font-playfair italic text-foreground mb-4">
          Acompañamiento integral y profesional
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Cada detalle importa. Ofrecemos un servicio completo para que usted pueda concentrarse en lo que realmente importa: despedirse con amor.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {SERVICES.map((service) => (
          <div
            key={service.title}
            className="group bg-card rounded-lg overflow-hidden border border-border/50 hover:border-gold/30 transition-brand hover:shadow-lg"
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
                <service.icon className="w-5 h-5 text-gold" />
                <h3 className="font-playfair text-lg text-foreground">{service.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ServicesSection;
