/**
 * Widget hiperlocal "Atendemos en tu comuna" — se inserta al final de cada blog post.
 * Refuerza linking interno hacia las landing pages de comunas y mejora SEO/GEO.
 */
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { COMUNAS_RM, TOP_COMUNAS_SLUGS } from "@/lib/comunas-rm";

const AtendemosTuComuna = () => {
  const top = TOP_COMUNAS_SLUGS
    .map((slug) => COMUNAS_RM.find((c) => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <aside
      aria-label="Cobertura por comuna de la Región Metropolitana"
      className="mt-12 rounded-lg border border-gold/30 bg-gold/5 p-6"
    >
      <div className="flex items-start gap-3 mb-4">
        <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="font-playfair text-lg text-foreground mb-1">
            Atendemos en tu comuna — 24/7 en toda la Región Metropolitana
          </h2>
          <p className="text-sm text-muted-foreground">
            Servicios funerarios completos con respuesta inmediata en las 52 comunas de la RM.
          </p>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {top.map((c) => (
          <li key={c.slug}>
            <Link
              to={`/funeraria/${c.slug}`}
              className="inline-block text-xs px-3 py-1.5 rounded-full border border-gold/40 bg-background text-foreground font-medium transition-colors duration-300 hover:bg-gold hover:text-accent-foreground hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              title={`Funeraria en ${c.nombre} — atención 24/7`}
            >
              Funeraria en {c.nombre}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/cobertura-region-metropolitana"
            className="inline-block text-xs px-3 py-1.5 rounded-full bg-gold text-accent-foreground font-medium transition-colors duration-300 hover:bg-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            Ver las 52 comunas →
          </Link>
        </li>
      </ul>
    </aside>
  );
};

export default AtendemosTuComuna;
