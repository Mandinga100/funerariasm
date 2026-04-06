import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Search } from "lucide-react";

interface Memorial {
  id: string;
  slug: string;
  full_name: string;
  birth_date: string | null;
  death_date: string;
  photo_url: string | null;
  tribute_text: string | null;
  city: string | null;
  published_at: string | null;
}

const ITEMS_PER_PAGE = 6;

const Memoriales = () => {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    document.title = "Legados Eternos | Funeraria Santa Margarita";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Legados eternos para honrar la memoria de quienes partieron. Comparta condolencias y tributos. Funeraria Santa Margarita, Chile.");

    const fetchData = async () => {
      const { data } = await supabase
        .from("memorials")
        .select("id, slug, full_name, birth_date, death_date, photo_url, tribute_text, city, published_at")
        .eq("published", true)
        .order("death_date", { ascending: false });
      setMemorials((data as Memorial[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return memorials;
    const q = search.toLowerCase();
    return memorials.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        (m.city && m.city.toLowerCase().includes(q))
    );
  }, [memorials, search]);

  useEffect(() => setCurrentPage(1), [search]);

  const totalPages = Math.max(1, Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), 10));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

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
    name: "Legados Eternos - Funeraria Santa Margarita",
    description: "Legados eternos para honrar la memoria de quienes partieron.",
    url: "https://funerariasantamargarita.cl/memoriales",
    publisher: { "@type": "Organization", name: "Funeraria Santa Margarita" },
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="pt-28 pb-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <span className="inline-block border border-[hsl(0,0%,30%)] rounded-full px-6 py-2 text-[11px] tracking-[0.25em] uppercase text-primary-foreground/60 mb-8">
            Muro de la Memoria
          </span>
          <h1 className="font-playfair italic text-primary-foreground/90 mb-2" style={{ fontSize: "clamp(3rem, 8vw, 6rem)", lineHeight: 1 }}>
            Legados
          </h1>
          <h1 className="font-playfair italic text-primary-foreground/50 mb-10" style={{ fontSize: "clamp(3rem, 8vw, 6rem)", lineHeight: 1 }}>
            Eternos
          </h1>
          <blockquote className="max-w-2xl mx-auto border-l-2 border-gold/20 pl-6 mb-12">
            <p className="text-primary-foreground/40 text-base md:text-lg italic font-playfair leading-relaxed">
              "En cada historia reside un legado que trasciende el tiempo, habitando eternamente en la serenidad de nuestro recuerdo."
            </p>
          </blockquote>
          <div className="w-16 h-[1px] bg-gold/30 mx-auto mb-12" />
        </div>
      </section>

      {/* Search + Cards */}
      <section className="py-16 bg-primary -mt-10">
        <div className="container max-w-5xl">
          {/* Search bar */}
          <div className="max-w-xl mx-auto mb-16 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar un legado..."
              className="w-full pl-14 pr-6 py-4 rounded-full bg-primary-foreground/5 border border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm focus:outline-none focus:border-gold/40 transition-all duration-300"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-primary-foreground/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-primary-foreground/40">
                {search ? "No se encontraron resultados para su búsqueda." : "No hay legados publicados actualmente."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {paginated.map((mem) => {
                  const birthYear = mem.birth_date ? new Date(mem.birth_date).getFullYear() : null;
                  const deathYear = new Date(mem.death_date).getFullYear();
                  return (
                    <Link
                      key={mem.id}
                      to={`/memoriales/${mem.slug}`}
                      className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-primary-foreground/5"
                    >
                      {/* Photo */}
                      {mem.photo_url ? (
                        <img
                          src={mem.photo_url}
                          alt={`Retrato de ${mem.full_name}`}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary-foreground/5">
                          <span className="text-5xl font-playfair text-gold/30">
                            {mem.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </span>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                        <span className="text-primary-foreground/80 text-sm tracking-[0.2em] uppercase font-light">
                          Habitar su Legado
                        </span>
                      </div>

                      {/* Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h2 className="font-playfair text-lg text-primary-foreground font-medium leading-tight mb-1">
                          {mem.full_name}
                        </h2>
                        <p className="text-primary-foreground/50 text-sm">
                          {birthYear ? `${birthYear} — ${deathYear}` : deathYear}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {filtered.length > 0 && (
                <nav aria-label="Paginación de legados" className="mt-16 flex justify-center">
                  <div className="inline-flex items-center gap-1 bg-primary-foreground/5 border border-primary-foreground/10 rounded-full px-2 py-1.5">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground/40 hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300" aria-label="Página anterior"><span className="text-sm">‹</span></button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button key={page} onClick={() => handlePageChange(page)} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${currentPage === page ? "bg-gold text-primary-foreground shadow-[0_0_12px_-2px_hsl(var(--gold)/0.5)]" : "text-primary-foreground/40 hover:text-gold hover:bg-gold/10"}`} aria-label={`Página ${page}`} aria-current={currentPage === page ? "page" : undefined}>{page}</button>
                    ))}
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground/40 hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300" aria-label="Página siguiente"><span className="text-sm">›</span></button>
                  </div>
                </nav>
              )}
              {filtered.length > 0 && (
                <p className="text-center text-xs text-primary-foreground/30 mt-4">Página {currentPage} de {totalPages}</p>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Memoriales;
