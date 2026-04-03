import { useState, useCallback, useEffect } from "react";
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

const PlanCard = ({ plan }: { plan: typeof PLANS[0] }) => (
  <div className="flex flex-col rounded-2xl overflow-hidden bg-[hsl(210,15%,10%)] border border-[hsl(0,0%,20%)] transition-all duration-300 hover:border-[hsl(var(--gold)/0.4)] hover:shadow-[0_8px_32px_-8px_hsl(var(--gold)/0.15)] h-full">
    {/* Image */}
    <div className="relative aspect-[16/10] overflow-hidden">
      <img
        src={plan.img}
        alt={plan.name}
        loading="lazy"
        width={800}
        height={512}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(210,15%,10%)] via-transparent to-transparent" />
    </div>

    {/* Content */}
    <div className="flex flex-col flex-1 p-6 pt-4">
      <h3 className="font-playfair italic text-xl text-primary-foreground mb-1">
        {plan.name}
      </h3>
      <p className="text-gold text-2xl font-semibold font-inter mb-5">
        {plan.price}
      </p>

      {/* Feature badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {plan.features.map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[hsl(180,30%,15%)] border border-[hsl(180,30%,25%)] text-[11px] font-medium uppercase tracking-wider text-[hsl(180,40%,65%)]"
          >
            <Check className="w-3 h-3" />
            {f}
          </span>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Buttons */}
      <div className="flex gap-3">
        <Link
          to={`/planes#${plan.id}`}
          className="flex-1 text-center py-2.5 rounded-md border border-[hsl(0,0%,30%)] text-primary-foreground text-xs font-semibold uppercase tracking-wider transition-brand hover:bg-[hsl(0,0%,20%)]"
        >
          Ver detalles
        </Link>
        <a
          href="tel:+56964333760"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md bg-gold text-primary-foreground text-xs font-semibold uppercase tracking-wider transition-brand hover:bg-gold-dark"
        >
          Llamar ahora
        </a>
      </div>
    </div>
  </div>
);

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
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center text-primary-foreground transition-brand hover:bg-primary-foreground/20 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center text-primary-foreground transition-brand hover:bg-primary-foreground/20 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
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
