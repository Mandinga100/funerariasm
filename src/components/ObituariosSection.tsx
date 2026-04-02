import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, ArrowRight } from "lucide-react";

interface Obituary {
  id: string;
  slug: string;
  full_name: string;
  birth_date: string | null;
  death_date: string;
  photo_url: string | null;
  family_message: string | null;
  city: string | null;
}

const ObituariosSection = () => {
  const headerRef = useScrollReveal();
  const gridRef = useStaggerReveal(100);
  const [obituaries, setObituaries] = useState<Obituary[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("obituaries")
        .select("id, slug, full_name, birth_date, death_date, photo_url, family_message, city")
        .eq("published", true)
        .order("death_date", { ascending: false })
        .limit(3);
      if (data) setObituaries(data as Obituary[]);
    };
    fetch();
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
    <section id="obituarios" className="py-24 bg-card">
      <div className="container">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">En Su Memoria</p>
          <h2 className="text-section font-playfair italic text-foreground mb-4">
            Obituarios
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Honramos con dignidad y respeto la memoria de quienes han partido.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {obituaries.map((obit) => {
            const age = getYears(obit.birth_date, obit.death_date);
            return (
              <Link
                key={obit.id}
                to={`/obituarios/${obit.slug}`}
                className="group bg-background rounded-lg border border-border/50 hover:border-gold/30 p-6 text-center transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
              >
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-gold/20 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                  {obit.photo_url ? (
                    <img src={obit.photo_url} alt={obit.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-playfair text-gold/60">
                      {obit.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                  )}
                </div>
                <h3 className="font-playfair text-lg text-foreground mb-1 group-hover:text-gold transition-brand">
                  {obit.full_name}
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(obit.death_date)}
                  </span>
                  {age !== null && <span className="text-gold/60">✦ {age} años</span>}
                  {obit.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {obit.city}
                    </span>
                  )}
                </div>
                {obit.family_message && (
                  <p className="text-xs text-muted-foreground italic line-clamp-2">
                    "{obit.family_message}"
                  </p>
                )}
              </Link>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            to="/obituarios"
            className="group inline-flex items-center gap-2 text-gold hover:text-gold-light text-sm tracking-wide-brand uppercase transition-brand"
          >
            Ver todos los obituarios{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ObituariosSection;
