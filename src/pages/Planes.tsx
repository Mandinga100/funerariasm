import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import FuneralPlansSection from "@/components/FuneralPlansSection";
import { Phone, MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import FaqAccordion from "@/components/faq/FaqAccordion";
import type { FaqItem } from "@/lib/faq-data";
import { buildBreadcrumbJsonLd } from "@/lib/seo-schemas";

const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: "Planes Funerarios", path: "/planes" }]);

const PLANS = [
  {
    id: "margarita",
    name: "Plan Margarita",
    price: "$1.290.000",
    description: "Servicio esencial con dignidad y respeto. Ideal para familias que buscan una despedida sencilla y contenida.",
    features: ["Inscripción Registro Civil", "Vehículo Mortuorio", "Soporte Administrativo", "Capilla Básica"],
    highlighted: false,
  },
  {
    id: "azucena",
    name: "Plan Azucena",
    price: "$1.390.000",
    description: "Servicio completo con arreglo floral y tarjetas de condolencia incluidas.",
    features: ["Arreglo Floral", "50 Tarjetas", "Traslado Local", "Trámites Civiles"],
    highlighted: false,
  },
  {
    id: "acacia",
    name: "Plan Acacia",
    price: "$1.990.000",
    description: "Servicio ceremonial distinguido con urna especial y acompañamiento espiritual.",
    features: ["Urna Modelo Acacia", "Arreglo Floral", "Servicio Ceremonial", "Vehículo Acompañante"],
    highlighted: false,
  },
  {
    id: "orquidea",
    name: "Plan Orquídea",
    price: "$1.990.000",
    description: "Elegancia y calidez con urna premium y coordinación integral del servicio.",
    features: ["Urna Modelo Orquídea", "Arreglo Floral", "Sala Velación 12h", "Coordinación integral"],
    highlighted: false,
  },
  {
    id: "jazmin",
    name: "Plan Jazmín",
    price: "$2.790.000",
    description: "Servicio premium con atención personalizada y acabados de alta calidad.",
    features: ["Urna Modelo Jazmín", "Servicio Premium", "Sala Privada", "Asesoría Familiar"],
    highlighted: false,
  },
  {
    id: "castano",
    name: "Plan Castaño",
    price: "$3.990.000",
    description: "Plan exclusivo con cafetería para 50 personas y doble arreglo floral.",
    features: ["2 Arreglos Florales", "Cafetería 50 Personas", "Sala Privada 24h", "Carroza de Lujo"],
    highlighted: false,
  },
  {
    id: "rauli",
    name: "Plan Raulí",
    price: "$3.990.000",
    description: "Nuestra máxima expresión de servicio. Certificación médica y difusión en prensa.",
    features: ["Certificación Médica", "Aviso de Prensa", "Suite Presidencial 24h", "Cortejo VIP", "Memorial de Vida 4K"],
    highlighted: true,
  },
];

const PLANS_FAQ: FaqItem[] = [
  {
    question: "¿Cuánto cuesta un funeral en Chile?",
    answer: "En Funeraria Santa Margarita, nuestros planes van desde $1.290.000 (Plan Margarita) hasta $3.990.000 (Plan Raulí). Cada plan incluye diferentes niveles de servicio, urna, sala de velación y acompañamiento.",
    relatedLink: { label: "Comparar todos los planes", href: "/planes" },
  },
  {
    question: "¿Qué es la cuota mortuoria y cómo me ayuda a pagar?",
    answer: "La cuota mortuoria es un beneficio de las AFP, IPS y cajas de compensación que cubre parte de los gastos funerarios (aprox. 15 UF). Nosotros le asesoramos en todo el trámite para que recupere ese monto.",
    expandedAnswer: "Presente la factura del servicio, certificado de defunción y cédula del solicitante ante la AFP o IPS. El proceso toma entre 10 y 15 días hábiles.",
    relatedLink: { label: "Más sobre cuota mortuoria", href: "/preguntas-frecuentes" },
  },
  {
    question: "¿Existen facilidades de pago?",
    answer: "Sí, ofrecemos opciones de financiamiento y facilidades de pago. Consulte con nuestros asesores las alternativas disponibles según el plan seleccionado.",
    relatedLink: { label: "Hablar con un asesor", href: "/contacto" },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
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

      {/* Plans grid — sección editorial premium */}
      <FuneralPlansSection />

      {/* Inline FAQ */}
      <section className="py-20 bg-card border-t border-border/30">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <span className="inline-block border border-border/40 rounded-full px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-5">
              Preguntas Frecuentes
            </span>
            <h2 className="text-2xl md:text-3xl font-playfair italic text-foreground mb-3">
              Dudas sobre precios y financiamiento
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Resolvemos las consultas más comunes para que tome una decisión informada y tranquila.
            </p>
          </div>
          <FaqAccordion items={PLANS_FAQ} prefix="planes-faq" />
          <div className="text-center mt-8">
            <Link
              to="/preguntas-frecuentes"
              className="text-gold text-xs tracking-[0.15em] uppercase font-medium hover:text-gold-light transition-colors"
            >
              Ver todas las preguntas frecuentes →
            </Link>
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
