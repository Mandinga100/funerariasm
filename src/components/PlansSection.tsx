import { useState, useCallback, useEffect, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, Phone } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const PLANS = [
  {
    id: "margarita",
    name: "Plan Margarita",
    price: "$1.290.000",
    features: ["Inscripción Registro Civil", "Vehículo Mortuorio"],
    img: "/assets/images/planes/plan-margarita.jpg",
  },
  {
    id: "azucena",
    name: "Plan Azucena",
    price: "$1.390.000",
    features: ["Arreglo Floral", "50 Tarjetas"],
    img: "/assets/images/planes/plan-azucena.jpg",
  },
  {
    id: "acacia",
    name: "Plan Acacia",
    price: "$1.990.000",
    features: ["Urna Modelo Acacia", "Arreglo Floral"],
    img: "/assets/images/planes/plan-acacia.jpg",
  },
  {
    id: "orquidea",
    name: "Plan Orquídea",
    price: "$1.990.000",
    features: ["Urna Modelo Orquídea", "Arreglo Floral"],
    img: "/assets/images/planes/plan-orquidea.jpg",
  },
  {
    id: "jazmin",
    name: "Plan Jazmín",
    price: "$2.790.000",
    features: ["Urna Modelo Jazmín", "Servicio Premium"],
    img: "/assets/images/planes/plan-jazmin.jpg",
  },
  {
    id: "castano",
    name: "Plan Castaño",
    price: "$3.990.000",
    features: ["2 Arreglos Florales", "Cafetería 50 Personas"],
    img: "/assets/images/planes/plan-castano.jpg",
  },
  {
    id: "rauli",
    name: "Plan Raulí",
    price: "$3.990.000",
    features: ["Certificación Médica", "Aviso de Prensa"],
    img: "/assets/images/planes/plan-rauli.jpg",
  },
];

const PlanCard = ({ plan }: { plan: typeof PLANS[0] }) => {
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="group relative flex flex-col rounded-2xl overflow-hidden border border-[hsl(210,20%,12%)] transition-all duration-500 h-full hover:border-gold/40 hover:shadow-[0_8px_40px_-8px_hsl(var(--gold)/0.2)] hover:-translate-y-1"
      style={{ background: "linear-gradient(180deg, hsl(210,18%,8%) 0%, hsl(215,20%,10%) 100%)" }}
    >
      {/* Gold dust glow on hover */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsla(40,60%,55%,0.08), transparent 60%)",
        }}
      />

      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={plan.img}
          alt={plan.name}
          loading="lazy"
          width={800}
          height={512}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(215,20%,10%)] via-[hsl(215,20%,10%)/0.3] to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-6 pb-6 pt-5 text-center">
        <h3 className="font-playfair italic text-[1.35rem] text-primary-foreground mb-1">
          {plan.name}
        </h3>
        <p className="text-gold text-[1.7rem] font-bold font-inter mb-5 tracking-tight">
          {plan.price}
        </p>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-6">
          {plan.features.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{
                background: "hsla(180,25%,14%,0.7)",
                borderColor: "hsla(180,25%,28%,0.5)",
                color: "hsl(170,35%,60%)",
              }}
            >
              <Check className="w-3 h-3 shrink-0" />
              {f}
            </span>
          ))}
        </div>

        {/* Nota AFP/IPS */}
        <p className="text-[11px] leading-relaxed text-primary-foreground/55 italic mb-5 px-1">
          <span className="font-semibold not-italic text-gold/80">PD:</span> El monto a cancelar puede ser menor en función del beneficio <span className="not-italic font-medium text-primary-foreground/70">"Cuota Mortuoria"</span> entregado por su AFP o IPS.
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Separator */}
        <div className="w-full h-px mb-5" style={{ background: "hsla(210,15%,25%,0.5)" }} />

        {/* Buttons */}
        <div className="flex gap-3">
          <Link
            to={`/planes#${plan.id}`}
            className="flex-1 text-center py-3 rounded-lg border text-primary-foreground text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 hover:bg-primary-foreground/10"
            style={{ borderColor: "hsla(210,15%,35%,0.6)", background: "hsla(210,15%,15%,0.5)" }}
          >
            Ver detalles
          </Link>
          <a
            href="tel:+56964333760"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 shadow-[0_4px_15px_-3px_hsla(40,80%,50%,0.4)] hover:shadow-[0_6px_20px_-3px_hsla(40,80%,50%,0.5)] hover:brightness-110"
            style={{ background: "linear-gradient(135deg, hsl(40,80%,50%), hsl(35,85%,45%))", color: "#1a1a1a" }}
          >
            Llamar ahora
          </a>
        </div>
      </div>
    </div>
  );
};

const PlansSection = () => {
  const headerRef = useScrollReveal();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    slidesToScroll: 1,
    breakpoints: {
      "(min-width: 768px)": { slidesToScroll: 2 },
      "(min-width: 1280px)": { slidesToScroll: 3 },
    },
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section id="planes" className="py-24 bg-primary text-primary-foreground">
      <div className="container">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-6">
          <span className="inline-block border border-[hsl(0,0%,30%)] rounded-full px-6 py-2 text-[11px] tracking-[0.25em] uppercase text-primary-foreground/60 mb-6">
            Protocolos de Dignidad
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair italic mb-4">
            Planes Funerarios
          </h2>
          <p className="text-primary-foreground/50 italic text-base md:text-lg mb-6">
            Soluciones personalizadas según tus necesidades
          </p>
          <div className="w-16 h-0.5 bg-gold mx-auto" />
        </div>

        {/* Carousel */}
        <div className="relative mt-16">
          {/* Arrows */}
          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center text-primary-foreground transition-all duration-300 hover:bg-primary-foreground/20 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center text-primary-foreground transition-all duration-300 hover:bg-primary-foreground/20 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Slides */}
          <div className="overflow-hidden mx-8 md:mx-16" ref={emblaRef}>
            <div className="flex -ml-4 md:-ml-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="min-w-0 shrink-0 grow-0 basis-full sm:basis-1/2 xl:basis-1/3 pl-4 md:pl-6"
                >
                  <PlanCard plan={plan} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlansSection;
