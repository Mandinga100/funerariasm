/**
 * Mapa embebido OpenStreetMap por comuna — sin API key, gratuito, sin tracking.
 * Lazy-loaded vía iframe loading="lazy" para no afectar LCP.
 */
interface ComunaMapaEmbedProps {
  nombre: string;
  lat: number;
  lng: number;
}

const ComunaMapaEmbed = ({ nombre, lat, lng }: ComunaMapaEmbedProps) => {
  const delta = 0.04;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="rounded-lg overflow-hidden border border-border/50 shadow-sm bg-muted">
      <iframe
        title={`Mapa de cobertura funeraria en ${nombre}`}
        src={src}
        loading="lazy"
        className="w-full h-[320px] sm:h-[400px] border-0"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="px-4 py-2 text-xs text-muted-foreground bg-card border-t border-border/50">
        Cobertura permanente 24/7 en {nombre} — Funeraria Santa Margarita.{" "}
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=13/${lat}/${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold hover:text-gold-light underline underline-offset-2"
        >
          Ver en OpenStreetMap
        </a>
      </div>
    </div>
  );
};

export default ComunaMapaEmbed;
