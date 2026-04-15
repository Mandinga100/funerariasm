import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import FaqAccordion from "@/components/faq/FaqAccordion";
import { FAQ_CATEGORIES, getAllFaqItems } from "@/lib/faq-data";
import { Phone, MessageCircle } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";
import { buildBreadcrumbJsonLd } from "@/lib/seo-schemas";

const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: "Preguntas Frecuentes", path: "/preguntas-frecuentes" }]);

const SITE_URL = "https://funerariasantamargarita.cl";

const CategoryIcon = ({ path, active }: { path: string; active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-accent-foreground" : "text-gold"}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const PreguntasFrecuentes = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const title = "Preguntas Frecuentes — Funeraria Santa Margarita";
    const desc =
      "Respuestas a las preguntas más frecuentes sobre servicios funerarios, trámites, cremación, cuota mortuoria y previsión. Funeraria Santa Margarita, Santiago, Chile.";
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", desc);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", `${SITE_URL}/preguntas-frecuentes`);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${SITE_URL}/preguntas-frecuentes`);

    return () => {
      document.title = "Funeraria Santa Margarita — Servicio Funerario Profesional 24/7";
      if (canonical) canonical.setAttribute("href", SITE_URL);
    };
  }, []);

  const allItems = getAllFaqItems();
  const visibleCategories = activeCategory
    ? FAQ_CATEGORIES.filter((c) => c.key === activeCategory)
    : FAQ_CATEGORIES;

  // FAQPage JSON-LD — include all visible questions
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: visibleCategories.flatMap((cat) =>
      cat.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer + (item.expandedAnswer ? " " + item.expandedAnswer : ""),
        },
      }))
    ),
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-primary text-primary-foreground">
        <div className="container">
          <Breadcrumbs items={[{ label: "Preguntas Frecuentes" }]} />
          <div className="text-center">
            <p className="text-gold text-xs tracking-solemn uppercase mb-4">Resolvemos sus dudas</p>
            <h1 className="text-section font-playfair italic mb-4">Preguntas Frecuentes</h1>
            <p className="text-primary-foreground/60 max-w-xl mx-auto">
              Encuentre respuestas claras sobre servicios funerarios, trámites, costos, cremación, cuota mortuoria y previsión.
            </p>
          </div>
        </div>
      </section>

      {/* Category filter */}
      <section className="py-16 bg-background">
        <div className="container max-w-3xl">
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              onClick={() => setActiveCategory(null)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs tracking-wide-brand uppercase border transition-colors font-medium ${
                activeCategory === null
                  ? "bg-gold text-accent-foreground border-gold shadow-md"
                  : "bg-card text-muted-foreground border-gold/30 hover:border-gold/60 hover:text-foreground"
              }`}
            >
              Todas ({allItems.length})
            </button>
            {FAQ_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs tracking-wide-brand uppercase border transition-colors font-medium ${
                  activeCategory === cat.key
                    ? "bg-gold text-accent-foreground border-gold shadow-md"
                    : "bg-card text-muted-foreground border-gold/30 hover:border-gold/60 hover:text-foreground"
                }`}
              >
                <CategoryIcon path={cat.icon} active={activeCategory === cat.key} />
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ sections */}
          <div className="space-y-10">
            {visibleCategories.map((cat) => (
              <div key={cat.key}>
                <h2 className="font-playfair text-xl text-foreground mb-4 flex items-center gap-3">
                  <CategoryIcon path={cat.icon} active={false} />
                  {cat.label}
                </h2>
                <div className="bg-card border border-border/50 rounded-lg px-6">
                  <FaqAccordion items={cat.items} prefix={cat.key} />
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 text-center bg-card border border-border/50 rounded-lg p-8">
            <p className="font-playfair text-lg text-foreground mb-2">¿No encontró lo que buscaba?</p>
            <p className="text-sm text-muted-foreground mb-6">
              Estamos disponibles 24/7 para resolver cualquier consulta.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="tel:+56964333760"
                className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-accent-foreground px-6 py-3 rounded-full text-sm tracking-wide-brand uppercase font-medium transition-colors"
              >
                <Phone className="w-4 h-4" />
                Llamar ahora
              </a>
              <a
                href={buildWhatsAppUrlDirect("Hola, tengo una consulta sobre servicios funerarios.")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-foreground/20 hover:border-gold text-foreground hover:text-gold px-6 py-3 rounded-full text-sm tracking-wide-brand uppercase transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PreguntasFrecuentes;
