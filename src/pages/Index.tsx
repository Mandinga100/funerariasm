import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import PlansSection from "@/components/PlansSection";
import ServicesSection from "@/components/ServicesSection";
import PrevisionSection from "@/components/PrevisionSection";
import ObituariosSection from "@/components/ObituariosSection";
import MemorialesSection from "@/components/MemorialesSection";
import AboutSection from "@/components/AboutSection";
import BlogSection from "@/components/BlogSection";
import ContactoSection from "@/components/ContactoSection";

const SITE_URL = "https://funerariasantamargarita.cl";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["FuneralHome", "LocalBusiness"],
  "@id": `${SITE_URL}/#organization`,
  name: "Funeraria Santa Margarita",
  alternateName: "Funeraria Santa Margarita Chile",
  url: SITE_URL,
  logo: `${SITE_URL}/assets/images/ui/og-image.webp`,
  image: `${SITE_URL}/assets/images/ui/og-image.webp`,
  description:
    "Funeraria Santa Margarita ofrece servicios funerarios profesionales 24/7 en Santiago de Chile. Planes desde $1.290.000 con cobertura completa, gestión de trámites, velatorio, cremación y Legados Eternos.",
  telephone: "+56964333760",
  email: "funerariasantamargarita2026@gmail.com",
  foundingDate: "2024",
  priceRange: "$1.290.000 – $3.990.000 CLP",
  currenciesAccepted: "CLP",
  paymentAccepted: "Transferencia bancaria, Efectivo",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Santiago",
    addressRegion: "Región Metropolitana",
    addressCountry: "CL",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -33.4489,
    longitude: -70.6693,
  },
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Región Metropolitana de Santiago, Chile",
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ],
    opens: "00:00",
    closes: "23:59",
  },
  sameAs: [],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+56964333760",
      contactType: "customer service",
      availableLanguage: "Spanish",
      areaServed: "CL",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
        ],
        opens: "00:00",
        closes: "23:59",
      },
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Planes Funerarios",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Plan Margarita",
        price: "1290000",
        priceCurrency: "CLP",
        description: "Plan esencial con cobertura completa: inscripción Registro Civil, vehículo mortuorio y servicio profesional.",
        url: `${SITE_URL}/planes`,
      },
      {
        "@type": "Offer",
        name: "Plan Raulí",
        price: "3990000",
        priceCurrency: "CLP",
        description: "Plan premium con certificación médica incluida, aviso de prensa y cobertura integral.",
        url: `${SITE_URL}/planes`,
      },
    ],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Funeraria Santa Margarita",
  url: SITE_URL,
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "es-CL",
};

const Index = () => (
  <Layout>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
    />
    <HeroSection />
    <PlansSection />
    <ServicesSection />
    <PrevisionSection />
    <ObituariosSection />
    <MemorialesSection />
    <AboutSection />
    <BlogSection />
    <ContactoSection />
  </Layout>
);

export default Index;
