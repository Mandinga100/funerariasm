import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Check, Star, Phone, MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";

const PLANS = [
  {
    id: "margarita",
    name: "Plan Margarita",
    price: "$1.290.000",
    description: "Servicio esencial con dignidad y respeto. Ideal para familias que buscan una despedida sencilla y contenida.",
    features: [
      "Urna Estándar",
      "Soporte Administrativo",
      "Capilla Básica",
      "Libro de Condolencias",
      "Orientación en trámites",
    ],
    highlighted: false,
  },
  {
    id: "azucena",
    name: "Plan Azucena",
    price: "$1.360.000",
    description: "Servicio completo con traslado incluido. Pensado para brindar acompañamiento integral desde el primer momento.",
    features: [
      "Cofre Estándar Lineal",
      "Traslado Local Inmediato",
      "Capilla Pública o Domicilio",
      "Trámites Civiles incluidos",
      "Coordinación de velatorio",
    ],
    highlighted: false,
  },
  {
    id: "rosal",
    name: "Plan Rosal Abelia",
    price: "$1.750.000",
    description: "Equilibrio entre calidad y calidez. Incluye sala de velación y arreglo floral para una despedida memorable.",
    features: [
      "Cofre Especial",
      "Atención 24/7",
      "Sala de Velación 12h",
      "Arreglo Floral",
      "Libro de Condolencias",
      "Coordinación ceremonial",
    ],
    highlighted: false,
  },
  {
    id: "acacia",
    name: "Plan Acacia",
    price: "$2.250.000",
    description: "Servicio ceremonial distinguido con acompañamiento espiritual continuo para honrar la memoria.",
    features: [
      "Urna Acacia Especial",
      "Servicio Ceremonial completo",
      "Vehículo Acompañante",
      "Misas Mensuales",
      "Arreglo floral premium",
      "Coordinación integral",
    ],
    highlighted: false,
  },
  {
    id: "quillay",
    name: "Plan Quillay",
    price: "$2.390.000",
    description: "Maderas nobles nacionales y asesoría familiar dedicada. Una despedida con carácter y tradición.",
    features: [
      "Cofre Madera Barnizada Quillay",
      "Sala de Velación 12h",
      "Carroza Estándar",
      "Asesoría Familiar completa",
      "Arreglo floral",
      "Trámites incluidos",
    ],
    highlighted: false,
  },
  {
    id: "queule",
    name: "Plan Queule / Algarrobo",
    price: "$2.990.000",
    description: "Exclusividad en maderas nobles con sala privada 24 horas y carroza de lujo para una despedida distinguida.",
    features: [
      "Cofre Roble Nacional Queule",
      "Sala Privada 24h",
      "Arreglos Florales Especiales",
      "Carroza de Lujo",
      "Asesoría integral",
      "Coordinación completa",
    ],
    highlighted: false,
  },
  {
    id: "raul",
    name: "Plan Raúl Premium",
    price: "$3.590.000",
    description: "Nuestra máxima expresión de servicio. Maderas de importación, suite presidencial y cortejo VIP.",
    features: [
      "Cofre Maderas Importación Raúl",
      "Suite Presidencial 24h",
      "Cortejo VIP Mercedes-Benz",
      "Memorial de Vida 4K",
      "Arreglos florales exclusivos",
      "Servicio de protocolo VIP",
      "Coordinación integral premium",
    ],
    highlighted: true,
  },
];

const Planes = () => {
  const location = useLocation();
  const headerRef = useScrollReveal();
  const gridRef = useStaggerReveal(80);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [location.hash]);

  return (
    <Layout>
      {/* Hero */}
      <section className="pt-28 pb-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Planes Funerarios</p>
          <h1 className="text-section font-playfair italic mb-4">
            Opciones diseñadas para cada familia
          </h1>
          <p className="text-primary-foreground/60 max-w-2xl mx-auto">
            Cada plan está pensado para brindar dignidad, acompañamiento y tranquilidad. 
            Elija el que mejor se adapte a sus necesidades y permítanos encargarnos del resto.
          </p>
        </div>
      </section>

      {/* Urgency banner */}
      <section className="bg-[#8B0000]/10 border-y border-[#8B0000]/20">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-sm text-foreground font-medium">
            ¿Necesita asistencia inmediata? Estamos disponibles 24/7.
          </p>
          <div className="flex gap-3">
            <a
              href="tel:+56964333760"
              className="flex items-center gap-2 bg-[#8B0000] text-primary-foreground px-4 py-2 rounded-full text-xs font-medium transition-brand hover:bg-[#6B0000]"
            >
              <Phone className="w-3.5 h-3.5" />
              Llamar ahora
            </a>
            <a
              href={buildWhatsAppUrl({ intent: "fallecimiento" })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] text-primary-foreground px-4 py-2 rounded-full text-xs font-medium transition-brand hover:bg-[#128C7E]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp urgente
            </a>
          </div>
        </div>
      </section>

      {/* Plans grid */}
      <section className="py-20 bg-background">
        <div className="container">
          <div ref={headerRef} className="text-center mb-16">
            <h2 className="text-2xl font-playfair italic text-foreground mb-3">
              Compare nuestros planes
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Todos incluyen coordinación de trámites, contención emocional y asesoría profesional.
            </p>
          </div>

          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                id={plan.id}
                className={`group rounded-xl overflow-hidden transition-brand scroll-mt-28 ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground border-2 border-gold relative shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.3)]"
                    : "bg-card border border-border hover:border-gold/30 hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.1)]"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-gold/50 via-gold to-gold/50" />
                )}
                <div className="p-8">
                  {plan.highlighted && (
                    <div className="flex items-center gap-1.5 text-gold text-[10px] tracking-wide-brand uppercase font-semibold mb-4">
                      <Star className="w-3.5 h-3.5" /> Más elegido
                    </div>
                  )}
                  <h3 className="font-playfair text-xl mb-1">{plan.name}</h3>
                  <p className="text-gold text-3xl font-semibold font-inter mb-3">{plan.price}</p>
                  <p className={`text-sm leading-relaxed mb-6 ${
                    plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"
                  }`}>
                    {plan.description}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm ${
                        plan.highlighted ? "text-primary-foreground/80" : "text-foreground/80"
                      }`}>
                        <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={buildWhatsAppUrl({ intent: "cotizacion", selectedPlan: plan.name })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block text-center py-3.5 rounded-full text-sm tracking-wide-brand uppercase font-medium transition-brand ${
                      plan.highlighted
                        ? "bg-gold text-primary-foreground hover:bg-gold-dark hover:shadow-[0_6px_20px_-4px_hsl(var(--gold)/0.4)]"
                        : "border border-gold/40 text-gold hover:bg-gold hover:text-primary-foreground hover:shadow-[0_6px_20px_-4px_hsl(var(--gold)/0.3)]"
                    }`}
                  >
                    Cotizar {plan.name.replace("Plan ", "")}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container max-w-2xl text-center">
          <h2 className="text-2xl font-playfair italic mb-4">
            ¿Necesita orientación para elegir?
          </h2>
          <p className="text-primary-foreground/60 mb-8">
            Nuestros asesores le ayudarán a encontrar el plan adecuado según sus necesidades. 
            Sin compromiso ni presión.
          </p>
          <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-xl p-8">
            <ContactForm type="cotizacion" source="pagina-planes" />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Planes;
