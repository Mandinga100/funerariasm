/**
 * Hub de cobertura — listado de las 52 comunas de la RM agrupadas por provincia.
 * Ruta: /cobertura-region-metropolitana
 */
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import { applySeoMeta } from "@/lib/seo-meta";
import { COMUNAS_RM, getComunasByProvincia } from "@/lib/comunas-rm";
import { MapPin, Search, Phone } from "lucide-react";

const SITE_URL = "https://funerariasantamargarita.cl";
const PHONE_DISPLAY = "+56 9 6433 3760";

const CoberturaRM = () => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    applySeoMeta({
      title: "Cobertura Funeraria en la Región Metropolitana — 52 Comunas | Santa Margarita",
      description: "Funeraria con cobertura en las 52 comunas de la Región Metropolitana de Chile. Atención 24/7 en Santiago, Providencia, Las Condes, Maipú, Puente Alto, Ñuñoa y todas las comunas RM.",
      url: `${SITE_URL}/cobertura-region-metropolitana`,
      type: "website",
    });
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMUNAS_RM;
    const q = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return COMUNAS_RM.filter((c) =>
      c.nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof COMUNAS_RM>();
    for (const c of filtered) {
      if (!map.has(c.provincia)) map.set(c.provincia, []);
      map.get(c.provincia)!.push(c);
    }
    return map;
  }, [filtered]);

  // JSON-LD: ItemList con todas las comunas
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Cobertura funeraria en la Región Metropolitana",
    numberOfItems: COMUNAS_RM.length,
    itemListElement: COMUNAS_RM.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `Funeraria en ${c.nombre}`,
      url: `${SITE_URL}/funeraria/${c.slug}`,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cobertura RM", item: `${SITE_URL}/cobertura-region-metropolitana` },
    ],
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <header className="relative w-full pt-28 pb-12 bg-primary text-primary-foreground">
        <div className="container max-w-4xl">
          <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Cobertura RM" }]} />
          <p className="text-gold text-xs tracking-solemn uppercase mt-6 mb-3">
            <MapPin className="inline w-3 h-3 mr-1" /> Las 52 comunas de la Región Metropolitana
          </p>
          <h1 className="text-4xl sm:text-5xl font-playfair italic mb-4 leading-tight">
            Cobertura funeraria en toda la Región Metropolitana
          </h1>
          <p className="text-primary-foreground/85 max-w-2xl leading-relaxed">
            Servicios funerarios completos con atención 24/7 todo el año en las 52 comunas de la RM.
            Encuentre su comuna y conozca nuestros servicios hiperlocales.
          </p>
          <a
            href={`tel:+56964333760`}
            className="inline-flex items-center gap-2 mt-6 bg-gold text-accent-foreground px-6 py-3 rounded-full text-sm font-medium tracking-wide-brand uppercase hover:bg-gold-light transition-colors"
          >
            <Phone className="w-4 h-4" /> Llamar al {PHONE_DISPLAY}
          </a>
        </div>
      </header>

      <main className="bg-background py-12">
        <div className="container max-w-4xl">
          {/* Search */}
          <div className="relative mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busque su comuna (ej. Maipú, Puente Alto, Las Condes...)"
              aria-label="Buscar comuna"
              className="w-full pl-11 pr-4 py-3 rounded-full border border-border/60 bg-card text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 transition-colors"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No encontramos resultados para "{query}". Igualmente atendemos toda la RM —{" "}
              <a href="tel:+56964333760" className="text-gold underline">llámenos</a>.
            </p>
          ) : (
            Array.from(grouped.entries()).map(([provincia, comunas]) => (
              <section key={provincia} className="mb-10" aria-label={`Provincia de ${provincia}`}>
                <h2 className="font-playfair text-xl text-foreground mb-4 pb-2 border-b border-border/50">
                  Provincia de {provincia}
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    ({comunas.length} {comunas.length === 1 ? "comuna" : "comunas"})
                  </span>
                </h2>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 list-none p-0">
                  {comunas.map((c) => (
                    <li key={c.slug}>
                      <Link
                        to={`/funeraria/${c.slug}`}
                        className="block px-4 py-2.5 rounded-md border border-border/50 bg-card text-sm text-foreground hover:border-gold hover:bg-gold/5 hover:text-gold transition-colors"
                        title={`Funeraria en ${c.nombre} 24/7`}
                      >
                        {c.nombre}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </main>
    </Layout>
  );
};

export default CoberturaRM;
