import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { supabase } from "@/integrations/supabase/client";

interface Memorial {
  id: string;
  slug: string;
  full_name: string;
  birth_date: string | null;
  death_date: string;
  photo_url: string | null;
  tribute_text: string | null;
  city: string | null;
}

const MemorialesSection = () => {
  const headerRef = useScrollReveal();
  const cardsRef = useScrollReveal(0.1, "0px 0px -40px 0px");
  const [memorials, setMemorials] = useState<Memorial[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("memorials")
        .select("id, slug, full_name, birth_date, death_date, photo_url, tribute_text, city")
        .eq("published", true)
        .order("death_date", { ascending: false })
        .limit(3);
      if (data) setMemorials(data as Memorial[]);
    };
    load();
  }, []);

  const getYears = (birth: string | null, death: string) => {
    if (!birth) return "";
    const b = new Date(birth).getFullYear();
    const d = new Date(death).getFullYear();
    return `${b} — ${d}`;
  };

  return (
    <section id="memoriales" className="py-24 bg-primary">
      <div className="container">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-gold/60 text-xs tracking-[0.35em] uppercase mb-4">Muro de la Memoria</p>
          <h2 className="font-playfair italic text-primary-foreground/80 text-4xl md:text-5xl mb-4">
            Legados Eternos
          </h2>
          <p className="text-primary-foreground/40 max-w-2xl mx-auto">
            Espacios digitales para honrar y recordar a quienes amamos. Comparta condolencias y tributos.
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-12">
          {memorials.length === 0
            ? [1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-primary-foreground/5 animate-pulse" />
              ))
            : memorials.map((mem) => (
                <Link
                  key={mem.id}
                  to={`/memoriales/${mem.slug}`}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-primary-foreground/5"
                >
                  {mem.photo_url ? (
                    <img src={mem.photo_url} alt={`Retrato de ${mem.full_name}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-playfair text-gold/30">
                        {mem.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    <span className="text-primary-foreground/80 text-sm tracking-[0.2em] uppercase font-light">Habitar su Legado</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-playfair text-base text-primary-foreground font-medium leading-tight mb-1">
                      {mem.full_name}
                    </h3>
                    <p className="text-primary-foreground/50 text-sm">
                      {getYears(mem.birth_date, mem.death_date)}
                    </p>
                  </div>
                </Link>
              ))}
        </div>

        <div className="text-center">
          <Link
            to="/memoriales"
            className="group inline-flex items-center gap-2 text-gold/70 hover:text-gold text-sm tracking-[0.2em] uppercase transition-all duration-300"
          >
            Ver todos los legados{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MemorialesSection;
