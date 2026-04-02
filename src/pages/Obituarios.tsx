import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Calendar, Search, MapPin } from "lucide-react";

interface Obituary {
  id: string;
  slug: string;
  full_name: string;
  birth_date: string | null;
  death_date: string;
  photo_url: string | null;
  biography: string | null;
  wake_location: string | null;
  ceremony_location: string | null;
  ceremony_schedule: string | null;
  family_message: string | null;
  city: string | null;
  published_at: string | null;
}

const ITEMS_PER_PAGE = 6;
const MAX_PAGES = 10;

const Obituarios = () => {
  const [obituaries, setObituaries] = useState<Obituary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    document.title = "Obituarios | Funeraria Santa Margarita";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Obituarios y homenajes póstumos. Honramos la memoria de quienes partieron con dignidad y respeto. Funeraria Santa Margarita, Santiago, Chile.");

    const fetchObituaries = async () => {
      const { data } = await supabase
        .from("obituaries")
        .select("id, slug, full_name, birth_date, death_date, photo_url, biography, wake_location, ceremony_location, ceremony_schedule, family_message, city, published_at")
        .eq("published", true)
        .order("death_date", { ascending: false });
      setObituaries((data as Obituary[]) || []);
      setLoading(false);
    };
    fetchObituaries();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return obituaries;
    const q = search.toLowerCase();
    return obituaries.filter(
      (o) =>
        o.full_name.toLowerCase().includes(q) ||
        (o.city && o.city.toLowerCase().includes(q)) ||
        (o.biography && o.biography.toLowerCase().includes(q))
    );
  }, [obituaries, search]);

  // Reset page when search changes
  useEffect(() => setCurrentPage(1), [search]);

  const totalPages = Math.max(1, Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), MAX_PAGES));
  const paginatedItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Obituarios - Funeraria Santa Margarita",
    description: "Obituarios y homenajes póstumos.",
    url: "https://funerariasantamargarita.cl/obituarios",
    publisher: { "@type": "Organization", name: "Funeraria Santa Margarita" },
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="pt-28 pb-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">En Su Memoria</p>
          <h1 className="text-section font-playfair italic mb-4">Obituarios</h1>
          <p className="text-primary-foreground/60 max-w-xl mx-auto mb-8">
            Honramos con dignidad y respeto la memoria de quienes han partido.
          </p>
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o ciudad..."
              className="w-full pl-11 pr-4 py-3 rounded-full bg-background/10 backdrop-blur-sm border border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40 text-sm focus:outline-none focus:border-gold/50 transition-brand"
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container max-w-5xl">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-lg border border-border/50 p-6 animate-pulse flex gap-6">
                  <div className="w-24 h-24 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {search ? "No se encontraron resultados para su búsqueda." : "No hay obituarios publicados actualmente."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {paginatedItems.map((obit) => {
                const age = getYears(obit.birth_date, obit.death_date);
                return (
                  <Link
                    key={obit.id}
                    to={`/obituarios/${obit.slug}`}
                    className="group block bg-card rounded-lg border border-border/50 hover:border-gold/30 p-6 md:p-8 transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
                  >
                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted border-2 border-gold/20 shrink-0 flex items-center justify-center overflow-hidden mx-auto sm:mx-0">
                        {obit.photo_url ? (
                          <img src={obit.photo_url} alt={obit.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-playfair text-gold/60">
                            {obit.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h2 className="font-playfair text-xl text-foreground mb-1 group-hover:text-gold transition-brand">
                          {obit.full_name}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(obit.death_date)}
                          </span>
                          {age !== null && <span className="text-gold/60">✦ {age} años</span>}
                          {obit.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {obit.city}
                            </span>
                          )}
                        </div>
                        {obit.family_message && (
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 italic">
                            "{obit.family_message}"
                          </p>
                        )}
                        {obit.ceremony_location && (
                          <p className="text-xs text-gold/70 mt-2">
                            Ceremonia: {obit.ceremony_location} — {obit.ceremony_schedule}
                          </p>
                        )}
                      </div>
                      <div className="hidden md:flex items-center">
                        <span className="text-gold text-xs tracking-wide-brand uppercase opacity-0 group-hover:opacity-100 transition-brand">
                          Ver homenaje →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {filtered.length > 0 && (
            <nav aria-label="Paginación de obituarios" className="mt-12 flex justify-center">
              <div className="inline-flex items-center gap-1 bg-card border border-border/50 rounded-full px-2 py-1.5 shadow-sm">
                {/* Previous */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                  aria-label="Página anterior"
                >
                  <span className="text-sm">‹</span>
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      currentPage === page
                        ? "bg-gold text-primary-foreground shadow-[0_0_12px_-2px_hsl(var(--gold)/0.5)]"
                        : "text-muted-foreground hover:text-gold hover:bg-gold/10"
                    }`}
                    aria-label={`Página ${page}`}
                    aria-current={currentPage === page ? "page" : undefined}
                  >
                    {page}
                  </button>
                ))}

                {/* Next */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                  aria-label="Página siguiente"
                >
                  <span className="text-sm">›</span>
                </button>
              </div>
            </nav>
          )}

          {/* Page indicator */}
          {filtered.length > 0 && (
            <p className="text-center text-xs text-muted-foreground/60 mt-4">
              Página {currentPage} de {totalPages}
            </p>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Obituarios;
