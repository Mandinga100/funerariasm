import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import FuneralPlansSection from "@/components/FuneralPlansSection";
import { buildBreadcrumbJsonLd } from "@/lib/seo-schemas";

const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: "Planes Funerarios", path: "/planes" }]);

const Planes = () => {
  const location = useLocation();

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

      {/* Plans grid — sección editorial premium */}
      <FuneralPlansSection />

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
