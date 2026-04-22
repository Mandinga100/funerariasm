import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import { Calendar, MapPin, ArrowLeft, Heart } from "lucide-react";
import { buildBreadcrumbJsonLd, buildObituaryArticleJsonLd, buildPersonJsonLd } from "@/lib/seo-schemas";
import { applySeoMeta } from "@/lib/seo-meta";

interface Obituary {
  id: string;
  slug: string;
  full_name: string;
  birth_date: string | null;
  death_date: string;
  photo_url: string | null;
  biography: string | null;
  wake_location: string | null;
  wake_schedule: string | null;
  ceremony_location: string | null;
  ceremony_schedule: string | null;
  family_message: string | null;
  family_names: string | null;
  city: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

const ObituarioDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [obit, setObit] = useState<Obituary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("obituaries")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (data) {
        setObit(data as Obituary);

        // Build a snippet that always leads with the deceased's name so
        // search engines and social previews surface it prominently.
        const deathYear = data.death_date ? new Date(data.death_date + "T12:00:00").getFullYear() : null;
        const lifeSpan =
          data.birth_date && data.death_date
            ? `(${new Date(data.birth_date + "T12:00:00").getFullYear()} – ${deathYear})`
            : deathYear
              ? `(${deathYear})`
              : "";
        const namePrefix = `${data.full_name}${lifeSpan ? " " + lifeSpan : ""}.`;
        const tail =
          data.meta_description?.trim() ||
          data.family_message?.trim() ||
          data.biography?.trim() ||
          `Funeraria Santa Margarita acompaña a la familia con servicio funerario profesional 24/7 en Santiago, Chile.`;

        applySeoMeta({
          title: data.meta_title || `${data.full_name} — Obituario`,
          description: `${namePrefix} ${tail}`,
          url: `https://funerariasantamargarita.cl/obituarios/${data.slug}`,
          image: data.photo_url,
          type: "article",
          publishedAt: data.death_date,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const getYears = (birth: string | null, death: string) => {
    if (!birth) return null;
    const b = new Date(birth);
    const d = new Date(death);
    let age = d.getFullYear() - b.getFullYear();
    if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) age--;
    return age;
  };

  if (loading) {
    return (
      <Layout>
        {/* Hero skeleton — reserves portrait + name + dates space */}
        <div className="pt-28 pb-12 bg-primary min-h-[520px] sm:min-h-[580px] md:min-h-[640px]">
          <div className="container text-center">
            <div className="animate-pulse space-y-4">
              <div className="w-32 h-32 rounded-full bg-muted/20 mx-auto" />
              <div className="h-6 bg-muted/20 rounded w-1/3 mx-auto" />
              <div className="h-4 bg-muted/20 rounded w-1/4 mx-auto" />
              <div className="h-4 bg-muted/20 rounded w-1/5 mx-auto" />
            </div>
          </div>
        </div>
        {/* Body skeleton — family message + ceremony details reserve */}
        <div className="py-16 bg-background min-h-[800px]">
          <div className="container max-w-3xl space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-muted rounded animate-pulse"
                style={{ width: `${88 - (i % 4) * 10}%` }}
              />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!obit) {
    return (
      <Layout>
        <div className="pt-28 pb-16 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-playfair text-foreground mb-4">Obituario no encontrado</h1>
            <Link to="/obituarios" className="text-gold hover:text-gold-light transition-brand">
              ← Volver a Obituarios
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const age = getYears(obit.birth_date, obit.death_date);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: obit.full_name,
    description: obit.meta_description || obit.family_message || `Obituario de ${obit.full_name}`,
    url: `https://funerariasantamargarita.cl/obituarios/${obit.slug}`,
    publisher: { "@type": "Organization", name: "Funeraria Santa Margarita" },
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([{ name: "Obituarios", path: "/obituarios" }, { name: obit.full_name, path: `/obituarios/${obit.slug}` }])) }} />

      {/* Header */}
      <section className="pt-28 pb-16 bg-primary text-primary-foreground relative">
        <div className="container">
          <Breadcrumbs items={[{ label: "Obituarios", href: "/obituarios" }, { label: obit.full_name }]} />
          <Link
            to="/obituarios"
            className="inline-flex items-center gap-2 text-sm font-medium text-gold bg-gold/10 hover:bg-gold/20 backdrop-blur-sm px-5 py-2.5 rounded-full border border-gold/40 hover:border-gold/70 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.3)] hover:shadow-[0_0_20px_-4px_hsl(var(--gold)/0.5)] transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Volver a Obituarios
          </Link>

          <div className="text-center">
            {/* Photo */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-muted/20 border-3 border-gold/30 mx-auto mb-6 flex items-center justify-center overflow-hidden">
              {obit.photo_url ? (
                <img src={obit.photo_url} alt={obit.full_name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <span className="text-4xl font-playfair text-gold/50">
                  {obit.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-playfair italic text-primary-foreground mb-2">
              {obit.full_name}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-primary-foreground/60 mb-4">
              {obit.birth_date && (
                <span>{formatDate(obit.birth_date)}</span>
              )}
              {obit.birth_date && <span className="text-gold">✦</span>}
              <span>{formatDate(obit.death_date)}</span>
              {age !== null && (
                <span className="text-gold/60">({age} años)</span>
              )}
            </div>

            {obit.city && (
              <p className="flex items-center justify-center gap-1 text-xs text-primary-foreground/40">
                <MapPin className="w-3 h-3" /> {obit.city}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-background">
        <div className="container max-w-3xl">
          {/* Family message */}
          {obit.family_message && (
            <div className="bg-card border border-gold/20 rounded-lg p-8 mb-10 text-center">
              <Heart className="w-5 h-5 text-gold mx-auto mb-4" />
              <p className="text-foreground font-playfair italic text-lg leading-relaxed">
                "{obit.family_message}"
              </p>
              {obit.family_names && (
                <p className="text-sm text-muted-foreground mt-4">{obit.family_names}</p>
              )}
            </div>
          )}

          {/* Biography */}
          {obit.biography && (
            <div className="mb-10">
              <h2 className="font-playfair text-xl text-foreground mb-4">Reseña</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{obit.biography}</p>
            </div>
          )}

          {/* Service info */}
          {(obit.wake_location || obit.ceremony_location) && (
            <div className="bg-card border border-border/50 rounded-lg p-6 md:p-8">
              <h2 className="font-playfair text-xl text-foreground mb-6">Información del Servicio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {obit.wake_location && (
                  <div>
                    <p className="text-xs text-gold uppercase tracking-wide-brand mb-1">Velatorio</p>
                    <p className="text-sm text-foreground font-medium">{obit.wake_location}</p>
                    {obit.wake_schedule && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {obit.wake_schedule}
                      </p>
                    )}
                  </div>
                )}
                {obit.ceremony_location && (
                  <div>
                    <p className="text-xs text-gold uppercase tracking-wide-brand mb-1">Ceremonia</p>
                    <p className="text-sm text-foreground font-medium">{obit.ceremony_location}</p>
                    {obit.ceremony_schedule && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {obit.ceremony_schedule}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Back link */}
          <div className="text-center mt-12">
            <Link
              to="/obituarios"
              className="group inline-flex items-center gap-2 text-gold hover:text-gold-light text-sm font-medium tracking-wide-brand uppercase border border-gold/40 hover:border-gold/70 px-6 py-3 rounded-full bg-gold/5 hover:bg-gold/15 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.3)] hover:shadow-[0_0_20px_-4px_hsl(var(--gold)/0.5)] transition-all duration-300"
            >
              <span className="inline-block transition-transform duration-300 group-hover:-translate-x-1">←</span>
              Ver todos los obituarios
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ObituarioDetail;
