import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin } from "lucide-react";

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

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" });

  const getYears = (birth: string | null, death: string) => {
    if (!birth) return null;
    const b = new Date(birth);
    const d = new Date(death);
    let age = d.getFullYear() - b.getFullYear();
    if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) age--;
    return age;
  };

  return (
    <section id="memoriales" className="py-24 bg-background">
      <div className="container">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Espacios del Recuerdo</p>
          <h2 className="text-section font-playfair italic text-foreground mb-4">
            Memoriales
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Espacios digitales para honrar y recordar a quienes amamos. Comparta condolencias y tributos.
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {memorials.length === 0
            ? [1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-lg border border-border/50 p-6 animate-pulse text-center">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-3" />
                  <div className="h-4 bg-muted rounded w-2/3 mx-auto mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
                </div>
              ))
            : memorials.map((mem) => {
                const age = getYears(mem.birth_date, mem.death_date);
                return (
                  <Link
                    key={mem.id}
                    to={`/memoriales/${mem.slug}`}
                    className="group bg-card rounded-lg border border-border/50 hover:border-gold/30 p-6 text-center transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted border-2 border-gold/20 mx-auto mb-3 flex items-center justify-center overflow-hidden">
                      {mem.photo_url ? (
                        <img src={mem.photo_url} alt={mem.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-playfair text-gold/60">
                          {mem.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </span>
                      )}
                    </div>
                    <h3 className="font-playfair text-base text-foreground mb-1 group-hover:text-gold transition-brand">
                      {mem.full_name}
                    </h3>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(mem.death_date)}
                      </span>
                      {age !== null && <span className="text-gold/60">✦ {age} años</span>}
                      {mem.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {mem.city}
                        </span>
                      )}
                    </div>
                    {mem.tribute_text && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        &ldquo;{mem.tribute_text}&rdquo;
                      </p>
                    )}
                  </Link>
                );
              })}
        </div>

        <div className="text-center">
          <Link
            to="/memoriales"
            className="group inline-flex items-center gap-2 text-gold hover:text-gold-light text-sm tracking-wide-brand uppercase transition-brand"
          >
            Ver todos los memoriales{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MemorialesSection;
