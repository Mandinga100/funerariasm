import { useEffect, useState, useRef, useMemo, useCallback, forwardRef } from "react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Search } from "lucide-react";

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

/* ── Infinite auto-scroll row ── */
const CarouselRow = forwardRef<HTMLDivElement, { items: Obituary[]; direction: "left" | "right" }>(({ items, direction }, ref) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const speed = 0.35;
  const posRef = useRef(0);

  // Duplicate items enough to fill the screen
  const displayItems = useMemo(() => {
    if (items.length === 0) return [];
    const reps = Math.max(4, Math.ceil(30 / items.length));
    const arr: Obituary[] = [];
    for (let i = 0; i < reps; i++) arr.push(...items);
    return arr;
  }, [items]);

  const animate = useCallback(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;

    const dir = direction === "left" ? -1 : 1;
    posRef.current += dir * speed;

    const singleWidth = track.scrollWidth / (displayItems.length / items.length);

    if (direction === "left") {
      if (posRef.current <= -singleWidth) posRef.current += singleWidth;
    } else {
      if (posRef.current >= 0) posRef.current -= singleWidth;
    }

    track.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
    animRef.current = requestAnimationFrame(animate);
  }, [items.length, displayItems.length, direction]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [animate]);

  // Initialize position for right-direction rows to avoid jump
  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0 || direction !== "right") return;
    const singleWidth = track.scrollWidth / (displayItems.length / items.length);
    posRef.current = -singleWidth;
  }, [direction, items.length, displayItems.length]);

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

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden select-none">
      <div ref={trackRef} className="flex gap-4 will-change-transform" style={{ width: "max-content" }}>
        {displayItems.map((obit, idx) => {
          const age = getYears(obit.birth_date, obit.death_date);
          return (
            <Link
              key={`${obit.id}-${idx}`}
              to={`/obituarios/${obit.slug}`}
              draggable={false}
              className="group flex-shrink-0 w-[280px] sm:w-[300px] bg-background rounded-lg border border-border/50 hover:border-gold/30 p-5 text-center transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
            >
              <div className="w-16 h-16 rounded-full bg-muted border-2 border-gold/20 mx-auto mb-3 flex items-center justify-center overflow-hidden">
                {obit.photo_url ? (
                  <img src={obit.photo_url} alt={obit.full_name} className="w-full h-full object-cover pointer-events-none" draggable={false} loading="lazy" decoding="async" />
                ) : (
                  <span className="text-lg font-playfair text-gold/60">
                    {obit.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </span>
                )}
              </div>
              <h3 className="font-playfair text-base text-foreground mb-1 group-hover:text-gold transition-brand truncate">
                {obit.full_name}
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
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
                  &ldquo;{obit.family_message}&rdquo;
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
});

CarouselRow.displayName = "CarouselRow";

/* ── Main Section ── */
const ObituariosSection = () => {
  const headerRef = useScrollReveal();
  const [obituaries, setObituaries] = useState<Obituary[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("obituaries")
        .select("id, slug, full_name, birth_date, death_date, photo_url, family_message, city")
        .eq("published", true)
        .order("death_date", { ascending: false })
        .limit(20);
      if (data) setObituaries(data as Obituary[]);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return obituaries;
    const q = search.toLowerCase();
    return obituaries.filter(
      (o) =>
        o.full_name.toLowerCase().includes(q) ||
        (o.city && o.city.toLowerCase().includes(q))
    );
  }, [obituaries, search]);

  // Split into two rows
  const row1 = useMemo(() => {
    const half = Math.ceil(filtered.length / 2);
    return filtered.slice(0, Math.max(half, 1));
  }, [filtered]);

  const row2 = useMemo(() => {
    const half = Math.ceil(filtered.length / 2);
    return filtered.slice(half);
  }, [filtered]);

  return (
    <section id="obituarios" className="py-24 bg-card overflow-hidden">
      <div className="container">
        <div ref={headerRef} className="text-center mb-10">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">En Su Memoria</p>
          <h2 className="text-section font-playfair italic text-foreground mb-4">
            Obituarios
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Honramos con dignidad y respeto la memoria de quienes han partido.
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o ciudad..."
              className="w-full pl-11 pr-4 py-3 rounded-full bg-background border border-border hover:border-gold/30 focus:border-gold/50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold/20 transition-brand"
            />
          </div>
        </div>
      </div>

      {/* Carousel rows — full width */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              {search ? "No se encontraron resultados." : "No hay obituarios publicados actualmente."}
            </p>
          </div>
        ) : (
          <>
            <CarouselRow items={row1} direction="left" />
            {row2.length > 0 && <CarouselRow items={row2} direction="right" />}
          </>
        )}
      </div>

      <div className="container mt-10">
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
