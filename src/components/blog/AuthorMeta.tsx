import { Calendar, RefreshCw, ShieldCheck, User } from "lucide-react";

interface AuthorMetaProps {
  author: string;
  reviewer?: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  readingTime?: number;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 * E-E-A-T block: author, reviewer, publication & update dates.
 * Renders semantic <section> with microdata-friendly markup.
 */
const AuthorMeta = ({
  author,
  reviewer,
  publishedAt,
  updatedAt,
  readingTime,
}: AuthorMetaProps) => {
  const published = formatDate(publishedAt);
  const updated = formatDate(updatedAt);
  const showUpdated = updated && updated !== published;

  return (
    <section
      aria-label="Información editorial"
      className="not-prose my-8 rounded-xl border border-border/50 bg-card/50 p-5"
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div className="flex items-start gap-2.5">
          <User className="w-4 h-4 text-gold/70 mt-0.5 shrink-0" />
          <div>
            <dt className="text-[11px] uppercase tracking-wide-brand text-muted-foreground/70">
              Autor
            </dt>
            <dd className="text-foreground font-medium">{author}</dd>
          </div>
        </div>

        {reviewer && (
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-gold/70 mt-0.5 shrink-0" />
            <div>
              <dt className="text-[11px] uppercase tracking-wide-brand text-muted-foreground/70">
                Revisado por
              </dt>
              <dd className="text-foreground font-medium">{reviewer}</dd>
            </div>
          </div>
        )}

        {published && (
          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-gold/70 mt-0.5 shrink-0" />
            <div>
              <dt className="text-[11px] uppercase tracking-wide-brand text-muted-foreground/70">
                Publicado
              </dt>
              <dd className="text-foreground">{published}</dd>
            </div>
          </div>
        )}

        {showUpdated && (
          <div className="flex items-start gap-2.5">
            <RefreshCw className="w-4 h-4 text-gold/70 mt-0.5 shrink-0" />
            <div>
              <dt className="text-[11px] uppercase tracking-wide-brand text-muted-foreground/70">
                Actualizado
              </dt>
              <dd className="text-foreground">{updated}</dd>
            </div>
          </div>
        )}
      </dl>

      {readingTime ? (
        <p className="text-xs text-muted-foreground/70 mt-4 pt-3 border-t border-border/40">
          Tiempo estimado de lectura: <span className="text-foreground/80">{readingTime} min</span>
        </p>
      ) : null}
    </section>
  );
};

export default AuthorMeta;
