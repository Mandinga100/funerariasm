import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Calendar, Search, MapPin } from "lucide-react";

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
    document.title = "Memoriales | Funeraria Santa Margarita";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Memoriales digitales para honrar la memoria de quienes partieron. Comparta condolencias y tributos. Funeraria Santa Margarita, Chile.");

    const fetch = async () => {
      const { data } = await supabase
        .from("memorials")
        .select("id, slug, full_name, birth_date, death_date, photo_url, tribute_text, city, published_at")
        .eq("published", true)
        .order("death_date", { ascending: false });
      setMemorials((data as Memorial[]) || []);
      setLoading(false);
    };
    fetch();
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });

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
    name: "Memoriales - Funeraria Santa Margarita",
    description: "Memoriales digitales para honrar la memoria de quienes partieron.",
    url: "https://funerariasantamargarita.cl/memoriales",
    publisher: { "@type": "Organization", name: "Funeraria Santa Margarita" },
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="pt-28 pb-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Espacios del Recuerdo</p>
          <h1 className="text-section font-playfair italic mb-4">Memoriales</h1>
          <p className="text-primary-foreground/60 max-w-xl mx-auto mb-8">
            Espacios digitales para honrar y recordar a quienes amamos. Comparta sus condolencias y tributos.
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card rounded-lg border border-border/50 p-6 animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4" />
                  <div className="h-5 bg-muted rounded w-1/2 mx-auto mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3 mx-auto mb-4" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3 mx-auto" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {search ? "No se encontraron resultados para su búsqueda." : "No hay memoriales publicados actualmente."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginated.map((mem) => {
                  const age = getYears(mem.birth_date, mem.death_date);
                  return (
                    <Link
                      key={mem.id}
                      to={`/memoriales/${mem.slug}`}
                      className="group bg-card rounded-lg border border-border/50 hover:border-gold/30 p-6 text-center transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
                    >
                      <div className="w-20 h-20 rounded-full bg-muted border-2 border-gold/20 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                        {mem.photo_url ? (
                          <img src={mem.photo_url} alt={mem.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-playfair text-gold/60">
                            {mem.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </span>
                        )}
                      </div>
                      <h2 className="font-playfair text-xl text-foreground mb-1 group-hover:text-gold transition-brand">
                        {mem.full_name}
                      </h2>
                      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(mem.death_date)}
                        </span>
                        {age !== null && <span className="text-gold/60">✦ {age} años</span>}
                        {mem.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {mem.city}
                          </span>
                        )}
                      </div>
                      {mem.tribute_text && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 italic">
                          "{mem.tribute_text}"
                        </p>
                      )}
                      <p className="text-gold text-xs tracking-wide-brand uppercase mt-4 opacity-0 group-hover:opacity-100 transition-brand">
                        Ver memorial →
                      </p>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {filtered.length > 0 && (
                <nav aria-label="Paginación de memoriales" className="mt-12 flex justify-center">
                  <div className="inline-flex items-center gap-1 bg-card border border-border/50 rounded-full px-2 py-1.5 shadow-sm">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300" aria-label="Página anterior"><span className="text-sm">‹</span></button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button key={page} onClick={() => handlePageChange(page)} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${currentPage === page ? "bg-gold text-primary-foreground shadow-[0_0_12px_-2px_hsl(var(--gold)/0.5)]" : "text-muted-foreground hover:text-gold hover:bg-gold/10"}`} aria-label={`Página ${page}`} aria-current={currentPage === page ? "page" : undefined}>{page}</button>
                    ))}
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300" aria-label="Página siguiente"><span className="text-sm">›</span></button>
                  </div>
                </nav>
              )}
              {filtered.length > 0 && (
                <p className="text-center text-xs text-muted-foreground/60 mt-4">Página {currentPage} de {totalPages}</p>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Memoriales;
