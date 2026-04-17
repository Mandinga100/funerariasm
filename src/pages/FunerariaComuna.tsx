/**
 * Landing page hiperlocal por comuna de la RM.
 * Ruta: /funeraria/:comuna
 *
 * SEO/AEO/GEO/LLMO:
 *  - Schema LocalBusiness (con coords + areaServed)
 *  - Schema FAQPage con preguntas hiperlocales
 *  - Schema BreadcrumbList
 *  - Meta dinámicos por comuna
 *  - Linking interno a comunas vecinas
 *  - Mapa OpenStreetMap embebido
 */
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import ComunaMapaEmbed from "@/components/comuna/ComunaMapaEmbed";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import { applySeoMeta } from "@/lib/seo-meta";
import { getComunaBySlug, COMUNAS_RM } from "@/lib/comunas-rm";
import { trackComunaPageView, trackComunaConversion } from "@/lib/comuna-tracking";
import { Phone, MessageCircle, MapPin, Clock, ShieldCheck, Heart, Flower2 } from "lucide-react";
import NotFound from "@/pages/NotFound";

const SITE_URL = "https://funerariasantamargarita.cl";
const PHONE = "+56964333760";
const PHONE_DISPLAY = "+56 9 6433 3760";
const WHATSAPP = `https://wa.me/${PHONE.replace("+", "")}`;

const SERVICIOS = [
  { icon: Heart, title: "Servicios funerarios completos", desc: "Velatorios, ceremonias, traslados y trámites totalmente gestionados." },
  { icon: Flower2, title: "Cremación y sepultación", desc: "Coordinación con los principales cementerios y crematorios de la RM." },
  { icon: ShieldCheck, title: "Previsión funeraria", desc: "Planes con precios congelados para liberar a su familia de gestiones futuras." },
  { icon: Clock, title: "Atención 24/7", desc: "Disponibilidad permanente todos los días del año, incluyendo madrugadas y festivos." },
];

const FunerariaComuna = () => {
  const { comuna: slug } = useParams<{ comuna: string }>();
  const comuna = useMemo(() => (slug ? getComunaBySlug(slug) : undefined), [slug]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!comuna) return;
    const title = `Funeraria en ${comuna.nombre} 24/7 — Servicios Funerarios | Santa Margarita`;
    const description = `Funeraria en ${comuna.nombre}, Región Metropolitana. Atención 24/7 todo el año, cremación, sepultación, velatorios, traslados y previsión funeraria. Llame al ${PHONE_DISPLAY}.`;
    applySeoMeta({
      title,
      description,
      url: `${SITE_URL}/funeraria/${comuna.slug}`,
      type: "website",
    });
    // Tracking propio: registra pageview (deduplicado por sesión)
    void trackComunaPageView(comuna.slug, comuna.nombre);
  }, [comuna]);

  if (!comuna) return <NotFound />;

  const vecinasData = comuna.vecinas
    .map((v) => COMUNAS_RM.find((c) => c.slug === v))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  // ===== JSON-LD =====
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "FuneralHome"],
    "@id": `${SITE_URL}/funeraria/${comuna.slug}#localbusiness`,
    name: `Funeraria Santa Margarita — ${comuna.nombre}`,
    description: comuna.descripcion,
    url: `${SITE_URL}/funeraria/${comuna.slug}`,
    telephone: PHONE,
    email: "funerariasantamargarita2026@gmail.com",
    image: `${SITE_URL}/assets/images/ui/og-image.webp`,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: comuna.nombre,
      addressRegion: "Región Metropolitana",
      addressCountry: "CL",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: comuna.lat,
      longitude: comuna.lng,
    },
    areaServed: {
      "@type": "City",
      name: comuna.nombre,
      containedInPlace: { "@type": "AdministrativeArea", name: "Región Metropolitana de Santiago" },
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    ],
    sameAs: [],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: comuna.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <header className="relative w-full pt-28 pb-16 bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10" aria-hidden="true"
          style={{ background: "radial-gradient(ellipse 60% 80% at 70% 50%, hsl(var(--gold)), transparent 70%)" }}
        />
        <div className="container max-w-4xl relative">
          <Breadcrumbs
            items={[
              { label: "Inicio", href: "/" },
              { label: "Cobertura RM", href: "/cobertura-region-metropolitana" },
              { label: `Funeraria en ${comuna.nombre}` },
            ]}
          />
          <p className="text-gold text-xs tracking-solemn uppercase mt-6 mb-4">
            <MapPin className="inline w-3 h-3 mr-1" /> {comuna.nombre} · Región Metropolitana
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-playfair italic text-primary-foreground leading-tight mb-6">
            Funeraria en {comuna.nombre}
          </h1>
          <p className="text-lg text-primary-foreground/85 max-w-3xl mb-8 leading-relaxed">
            {comuna.descripcion}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${PHONE}`}
              onClick={() => trackComunaConversion(comuna.slug, comuna.nombre, "cta_call", "hero")}
              className="inline-flex items-center gap-2 bg-gold text-accent-foreground px-6 py-3 rounded-full text-sm font-medium tracking-wide-brand uppercase transition-colors hover:bg-gold-light"
            >
              <Phone className="w-4 h-4" /> Llamar 24/7
            </a>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackComunaConversion(comuna.slug, comuna.nombre, "cta_whatsapp", "hero")}
              className="inline-flex items-center gap-2 border border-primary-foreground/30 text-primary-foreground px-6 py-3 rounded-full text-sm font-medium tracking-wide-brand uppercase transition-colors hover:bg-primary-foreground/10"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>
      </header>

      <main className="bg-background py-16">
        <div className="container max-w-4xl space-y-16">
          {/* Servicios */}
          <section aria-label={`Servicios funerarios en ${comuna.nombre}`}>
            <h2 className="font-playfair text-2xl text-foreground mb-6">
              Servicios funerarios disponibles en {comuna.nombre}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVICIOS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="border border-border/50 rounded-lg p-5 bg-card hover:border-gold/40 transition-colors">
                  <Icon className="w-6 h-6 text-gold mb-3" aria-hidden="true" />
                  <h3 className="font-medium text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Cementerios */}
          <section aria-label={`Cementerios cercanos a ${comuna.nombre}`}>
            <h2 className="font-playfair text-2xl text-foreground mb-4">
              Cementerios y parques cementerio cercanos a {comuna.nombre}
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Coordinamos sepultación, cremación, nichos y traslados con los principales camposantos del sector:
            </p>
            <ul className="space-y-2 list-none p-0">
              {comuna.cementerios.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Mapa */}
          <section aria-label={`Mapa de cobertura en ${comuna.nombre}`}>
            <h2 className="font-playfair text-2xl text-foreground mb-4">
              Cobertura geográfica en {comuna.nombre}
            </h2>
            <ComunaMapaEmbed nombre={comuna.nombre} lat={comuna.lat} lng={comuna.lng} />
          </section>

          {/* FAQ */}
          {comuna.faq.length > 0 && (
            <section aria-label={`Preguntas frecuentes sobre servicios funerarios en ${comuna.nombre}`}>
              <h2 className="font-playfair text-2xl text-foreground mb-6">
                Preguntas frecuentes — {comuna.nombre}
              </h2>
              <div className="space-y-4">
                {comuna.faq.map((f, i) => (
                  <details
                    key={i}
                    className="group border border-border/50 rounded-lg bg-card overflow-hidden"
                  >
                    <summary className="cursor-pointer list-none p-5 font-medium text-foreground hover:bg-muted/30 transition-colors flex items-center justify-between gap-4">
                      <span>{f.q}</span>
                      <span className="text-gold text-xl shrink-0 group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="px-5 pb-5 text-muted-foreground leading-relaxed">{f.a}</div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="rounded-lg border border-gold/40 bg-gold/5 p-8 text-center">
            <h2 className="font-playfair text-2xl text-foreground mb-3">
              ¿Necesita ayuda funeraria en {comuna.nombre} ahora?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Atendemos las 24 horas, todos los días del año. Respuesta inmediata, trámites totalmente gestionados.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href={`tel:${PHONE}`}
                onClick={() => trackComunaConversion(comuna.slug, comuna.nombre, "cta_call", "footer_cta")}
                className="inline-flex items-center gap-2 bg-gold text-accent-foreground px-6 py-3 rounded-full text-sm font-medium tracking-wide-brand uppercase hover:bg-gold-light transition-colors"
              >
                <Phone className="w-4 h-4" /> Llamar al {PHONE_DISPLAY}
              </a>
              <Link
                to="/planes"
                onClick={() => trackComunaConversion(comuna.slug, comuna.nombre, "view_planes")}
                className="inline-flex items-center gap-2 border border-foreground/20 text-foreground px-6 py-3 rounded-full text-sm font-medium tracking-wide-brand uppercase hover:border-gold hover:text-gold transition-colors"
              >
                Ver planes y precios
              </Link>
            </div>
          </section>

          {/* Comunas vecinas */}
          {vecinasData.length > 0 && (
            <section aria-label="Comunas vecinas">
              <h2 className="font-playfair text-2xl text-foreground mb-4">
                Atendemos también en comunas vecinas a {comuna.nombre}
              </h2>
              <ul className="flex flex-wrap gap-2 list-none p-0">
                {vecinasData.map((v) => (
                  <li key={v.slug}>
                    <Link
                      to={`/funeraria/${v.slug}`}
                      onClick={() => trackComunaConversion(comuna.slug, comuna.nombre, "navigate_vecina", v.slug)}
                      className="inline-block text-xs px-3 py-1.5 rounded-full border border-gold/40 bg-gold/10 text-gold font-medium hover:bg-gold hover:text-accent-foreground transition-colors"
                      title={`Funeraria en ${v.nombre}`}
                    >
                      Funeraria en {v.nombre}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to="/cobertura-region-metropolitana"
                    className="inline-block text-xs px-3 py-1.5 rounded-full bg-foreground/5 text-foreground font-medium hover:bg-foreground/10 transition-colors"
                  >
                    Ver las 52 comunas →
                  </Link>
                </li>
              </ul>
            </section>
          )}
        </div>
      </main>
      <ExitIntentPopup
        source="popup-salida-comuna"
        storageKey={`exit-intent-comuna-${comuna.slug}`}
        extraMetadata={{
          comuna_slug: comuna.slug,
          comuna_nombre: comuna.nombre,
        }}
        title={`Atendemos ${comuna.nombre} 24/7`}
        description={`¿Antes de irse? Reciba nuestra guía gratuita con todos los pasos, costos y trámites funerarios en ${comuna.nombre}. Apoyo profesional cuando más lo necesite.`}
        ctaLabel={`Recibir guía para ${comuna.nombre}`}
      />
    </Layout>
  );
};

export default FunerariaComuna;
