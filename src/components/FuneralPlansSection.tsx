/**
 * FuneralPlansSection
 * --------------------------------------------------------------
 * Cards verticales editoriales con nombre del plan centrado verticalmente,
 * precio + CTA al pie y animaciones premium al hover.
 */
import { useState } from "react";

/** LQIPs base64 (24x36, ~700B c/u) — suavizan la carga de cada imagen sin afectar LCP/CLS */
const BLUR = {
  margarita: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABgDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAQFBv/EACIQAAICAgEDBQAAAAAAAAAAAAECAxEABDESIYEFE1Fxkf/EABcBAAMBAAAAAAAAAAAAAAAAAAECAwT/xAAbEQACAwADAAAAAAAAAAAAAAAAAQIDERMxUf/aAAwDAQACEQMRAD8Ay8VEsWPbn8yxoumurGF2WWq6i1Dvk3WkSSVvlr4Fdqx8rq66t7tySGiVVaA85mslg6WLRvq009NlYyM85BKkm/vDIkm3asvQqrwFA4884YY1tdlOVeH/2Q==",
  azucena:   "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABgDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAQFAv/EACQQAAICAQMEAgMAAAAAAAAAAAECAxEABDESIVFhMSMyUdHw/8QAFwEAAwEAAAAAAAAAAAAAAAAAAAECA//EABoRAAICAwAAAAAAAAAAAAAAAAABAhESIUH/2gAMAwEAAhEDEQA/AI2lmkimj6HkV4wACD6P6yxu8k2qljLdRZUX4z9Sauxz+Mi6XcZtPIZI5irVRIRTx/DGDur6i3mXuOvPUTV5mrctlOktCkmjfyemXxMnK1xeGbm3XUyLXcpQrIBQ4U+xhjjl0Hjw/9k=",
  acacia:    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABgDASIAAhEBAxEB/8QAGAAAAgMAAAAAAAAAAAAAAAAAAAQBAgb/xAAjEAABBAIBAwUAAAAAAAAAAAABAAIDEQQhEhMxUQUyQWFi/8QAFgEBAQEAAAAAAAAAAAAAAAAABAID/8QAGhEAAwADAQAAAAAAAAAAAAAAAAECAxETQf/aAAwDAQACEQMRAD8AiOVs1hzpBf57K0+I7fRc559zq1x+6WWblTN7SOTEfquWzYlJNVsXpCeCk9pje0tDMscpld1nB4O+fkeUJAZuQ26kIs/CFspsjpHp/9k=",
  orquidea:  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABgDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAUBAwQG/8QAJxAAAgEDAQcFAQAAAAAAAAAAAQIDAAQREhMUITFRYXEFFSJBobH/xAAWAQEBAQAAAAAAAAAAAAAAAAACAwT/xAAZEQACAwEAAAAAAAAAAAAAAAAAAQISIRH/2gAMAwEAAhEDEQA/AMe8JPbGOJVVw4ClnJYDseXmmsVhbRnZyu8mzAZGzjnnOOtcrEW16BwbOcD+0z9waOA2wQfFdOT+1mrFMdnzSPVrRbNg0ZZ45DqVSeXXJ+6KouLvfLeOPDCUHJIPBu/miqYDT//Z",
  jazmin:    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABgDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAMEBf/EACUQAAIBAgQGAwAAAAAAAAAAAAECAwAEERIhUQUTIjFBcRShsf/EABYBAQEBAAAAAAAAAAAAAAAAAAABA//EABcRAQEBAQAAAAAAAAAAAAAAAAABEhH/2gAMAwEAAhEDEQA/AJ+GwQrDnvER8xxVT2A0/adfQ20ZjuWjDYELlRek7aeqwpLtuyFgMQQCcfunzXY+NJBnYuxBO3qs6Re9+2PIWJY4gTmHgbHTsaKyYLggctmKq56iB42opldcf//Z",
  castano:   "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABgDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAMFAgT/xAAjEAACAQQBAwUAAAAAAAAAAAABAgMABBEhEgUTMRRhgZHw/8QAFQEBAQAAAAAAAAAAAAAAAAAAAwT/xAAbEQACAQUAAAAAAAAAAAAAAAAAARECEiHR8P/aAAwDAQACEQMRAD8An95mjKle8cclkXAZKVHOrFwx7ILBj7Efs1lEuFiIeFNeMkH7pMq+onVooRHrD4Omqe6SmIKFvatIXZlHMnIUbdfjwKK67bqN/AFAhTgDpRjAooXX2NiJM//Z",
  rauli:     "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABgDASIAAhEBAxEB/8QAGAAAAgMAAAAAAAAAAAAAAAAAAAIBAwb/xAAjEAABAwQCAQUAAAAAAAAAAAABAAIRAxITMSEiMkFRYXGR/8QAFgEBAQEAAAAAAAAAAAAAAAAAAwEC/8QAFxEBAQEBAAAAAAAAAAAAAAAAAQARIf/aAAwDAQACEQMRAD8AzTBdTt2PYbHyowiMl/X65SisyAMQJHrJVwpOLL4FseM8/qLpKYyOFrLR1G4O3ISGsyCMUEiJkoWgaKX/2Q==",
} as const;

type FuneralPlan = {
  id: string;
  name: string;
  price: string;
  image: string;
  href: string;
  blurDataURL?: string;
};

const PLANS: readonly FuneralPlan[] = [
  { id: "margarita", name: "Margarita", price: "$1.290.000", image: "/assets/images/planes/plan-margarita.jpg", href: "/planes#margarita", blurDataURL: BLUR.margarita },
  { id: "azucena",   name: "Azucena",   price: "$1.390.000", image: "/assets/images/planes/plan-azucena.jpg",   href: "/planes#azucena",   blurDataURL: BLUR.azucena   },
  { id: "acacia",    name: "Acacia",    price: "$1.990.000", image: "/assets/images/planes/plan-acacia.jpg",    href: "/planes#acacia",    blurDataURL: BLUR.acacia    },
  { id: "orquidea",  name: "Orquídea",  price: "$1.990.000", image: "/assets/images/planes/plan-orquidea.jpg",  href: "/planes#orquidea",  blurDataURL: BLUR.orquidea  },
  { id: "jazmin",    name: "Jazmín",    price: "$2.790.000", image: "/assets/images/planes/plan-jazmin.jpg",    href: "/planes#jazmin",    blurDataURL: BLUR.jazmin    },
  { id: "castano",   name: "Castaño",   price: "$3.990.000", image: "/assets/images/planes/plan-castano.jpg",   href: "/planes#castano",   blurDataURL: BLUR.castano   },
  { id: "rauli",     name: "Raulí",     price: "$3.990.000", image: "/assets/images/planes/plan-rauli.jpg",     href: "/planes#rauli",     blurDataURL: BLUR.rauli     },
] as const;

interface FuneralPlanCardProps {
  plan: FuneralPlan;
  priority?: boolean;
}

const FuneralPlanCard = ({ plan, priority = false }: FuneralPlanCardProps) => {
  const [loaded, setLoaded] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const hasBlur = Boolean(plan.blurDataURL);

  return (
    <a
      href={plan.href}
      aria-label={`Ver detalle del Plan ${plan.name}`}
      onMouseEnter={() => setBurstKey((k) => k + 1)}
      onFocus={() => setBurstKey((k) => k + 1)}
      style={
        hasBlur
          ? {
              backgroundImage: `url(${plan.blurDataURL})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
      className="
        group relative block overflow-hidden rounded-sm isolate
        bg-black border border-[rgba(142,145,146,0.18)]
        h-[460px] sm:h-[520px] md:h-[640px] lg:h-[680px] xl:h-[720px]
        transition-[border-color,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
        focus:outline-none focus-visible:ring-1 focus-visible:ring-[#e9c176]
        focus-visible:ring-offset-2 focus-visible:ring-offset-black
        md:hover:border-[#e9c176]/50
      "
    >
      {/* Capa blur con saturación reducida — visible solo hasta que la imagen real cargue */}
      {hasBlur && !loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 blur-xl opacity-90"
          style={{
            backgroundImage: `url(${plan.blurDataURL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* Imagen — LCP candidate en la primera card (priority) */}
      <img
        src={plan.image}
        alt={`Imagen del Plan ${plan.name}`}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        // @ts-expect-error fetchpriority es atributo HTML válido (Chrome/Edge/Safari 17+)
        fetchpriority={priority ? "high" : "auto"}
        width={480}
        height={720}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`
          absolute inset-0 h-full w-full object-cover
          transition-[opacity,filter] duration-[2200ms] ease-[cubic-bezier(0.22,1,0.36,1)]
          transition-transform duration-[6000ms] ease-[cubic-bezier(0.16,0.84,0.3,1)]
          motion-reduce:transition-none
          ${hasBlur && !loaded ? "opacity-0" : "opacity-80"}
          md:group-hover:opacity-100 md:group-hover:scale-[1.025]
          md:group-hover:[filter:contrast(1.08)_saturate(1.12)_brightness(1.08)]
          motion-reduce:md:group-hover:[filter:none] motion-reduce:md:group-hover:scale-100
        `}
      />

      {/* Velo base oscuro para profundidad (sin transición costosa) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/85"
      />

      {/* Línea dorada inferior — solo opacity (compositada por GPU) */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-x-6 bottom-0 h-px
          bg-gradient-to-r from-transparent via-[#e9c176] to-transparent
          opacity-0
          transition-opacity duration-500 ease-out
          motion-reduce:transition-none
          md:group-hover:opacity-90
        "
      />

      {/* Nombre del plan — con aura dorada y destellos al hover */}
      <div className="absolute inset-x-0 top-[34%] flex items-center justify-center px-4 pointer-events-none md:top-[30%]">
        <div className="relative">
          {/*
            Área calibrada para destellos — overflow oculto y dimensiones fijas
            garantizan que las partículas nunca invadan el divisor superior del
            precio ni otros elementos del layout. Centrada sobre el título.
            Tamaño uniforme en todas las tarjetas → explosión idéntica.
          */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none absolute left-1/2 top-1/2
              -translate-x-1/2 -translate-y-1/2
              w-[240px] h-[200px]
              overflow-hidden
              motion-reduce:hidden
            "
          >
            {burstKey > 0 && (
              <div
                key={burstKey}
                // display:contents → no genera caja de layout, evita reflow al remount
                style={{ display: "contents" }}
              >
                {(() => {
                  // Patrón radial uniforme: 16 partículas distribuidas a 22.5°
                  // Direcciones idénticas en todas las tarjetas, tamaños variados
                  // pero distribuidos uniformemente, y delays desincronizados
                  // para que el movimiento no sea simultáneo.
                  const COUNT = 16;
                  const RADIUS = 92;
                  const SIZES = ["2.5px", "3px", "3.5px", "4px"];
                  const DELAY_ORDER = [0, 9, 2, 11, 4, 13, 6, 15, 1, 8, 3, 10, 5, 12, 7, 14];
                  return Array.from({ length: COUNT }).map((_, i) => {
                    const angle = (i / COUNT) * Math.PI * 2 - Math.PI / 2;
                    const r = RADIUS - (i % 2) * 10;
                    const sx = `${(Math.cos(angle) * r).toFixed(1)}px`;
                    const sy = `${(Math.sin(angle) * r).toFixed(1)}px`;
                    const size = SIZES[i % SIZES.length];
                    const delay = `${DELAY_ORDER[i] * 55}ms`;
                    return (
                      <span
                        key={i}
                        className="absolute left-1/2 top-1/2 -ml-px -mt-px rounded-full bg-[#fcecc4] animate-sparkle-burst opacity-0"
                        style={{
                          width: size,
                          height: size,
                          // @ts-expect-error CSS custom props
                          "--sx": sx,
                          "--sy": sy,
                          animationDelay: delay,
                          // Promoción a capa GPU: transform + opacity únicamente
                          willChange: "transform, opacity",
                          transform: "translateZ(0)",
                          backfaceVisibility: "hidden",
                          contain: "layout paint",
                          boxShadow:
                            "0 0 4px 0.5px rgba(252,236,196,0.95), 0 0 10px 1.5px rgba(243,220,168,0.6), 0 0 20px 2px rgba(233,193,118,0.35)",
                        }}
                      />
                    );
                  });
                })()}
              </div>
            )}
          </div>

          <h3
            className="
              font-playfair text-[#e8e2d8] text-center
              text-[1.7rem] md:text-[2rem] lg:text-[2.15rem] leading-tight
              [text-shadow:0_2px_18px_rgba(0,0,0,0.65)]
              transition-[color,text-shadow] duration-700 ease-out
              motion-reduce:transition-none
              md:group-hover:text-[#f6ecd0]
              md:group-hover:[text-shadow:0_0_22px_rgba(233,193,118,0.55),0_0_44px_rgba(233,193,118,0.25),0_2px_18px_rgba(0,0,0,0.65)]
              motion-reduce:md:group-hover:[text-shadow:0_2px_18px_rgba(0,0,0,0.65)]
            "
          >
            {plan.name}
          </h3>
        </div>
      </div>

      {/*
        CORTINA — Precio + CTA
        Sube de forma controlada para no llegar al título del plan.
      */}
      <div
        className="
          absolute inset-x-0 bottom-0
          translate-y-0
          transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]
          motion-reduce:transition-none
          will-change-transform
          md:group-hover:-translate-y-[32%]
          motion-reduce:md:group-hover:translate-y-0
        "
      >
        {/* Línea divisoria superior — corte limpio sin blur por encima del precio */}
        <div
          aria-hidden="true"
          className="h-px w-full bg-gradient-to-r from-transparent via-[#e9c176]/40 to-transparent"
        />
        {/* Cuerpo translúcido — blur para fundirse en imágenes claras u oscuras */}
        <div className="bg-gradient-to-b from-black/55 via-black/65 to-black/55 px-5 pb-6 pt-3 text-center backdrop-blur-[8px]">
          {!loaded ? (
            <>
              {/* Skeleton precio */}
              <span
                aria-hidden="true"
                className="block mx-auto h-[15px] w-24 rounded-sm bg-[rgba(232,226,216,0.12)] animate-pulse motion-reduce:animate-none"
              />
              {/* Skeleton divisor */}
              <span
                aria-hidden="true"
                className="block mx-auto mt-4 h-px w-10 bg-[rgba(232,226,216,0.18)]"
              />
              {/* Skeleton CTA */}
              <span
                aria-hidden="true"
                className="block mx-auto mt-4 h-[10px] w-20 rounded-sm bg-[rgba(233,193,118,0.18)] animate-pulse motion-reduce:animate-none"
              />
            </>
          ) : (
            <>
              <p
                className="
                  font-inter text-[15px] text-[#e8e2d8] tracking-tight
                  drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]
                  transition-colors duration-500 ease-out
                  motion-reduce:transition-none
                  md:group-hover:text-[#f4ead2]
                  animate-fade-in motion-reduce:animate-none
                "
              >
                {plan.price}
              </p>

              {/* Divisor — animado por transform (GPU) en lugar de width */}
              <span
                aria-hidden="true"
                className="
                  block mx-auto mt-4 h-px w-16 bg-[rgba(232,226,216,0.35)]
                  origin-center scale-x-50
                  transition-[transform,background-color] duration-700 ease-out
                  motion-reduce:transition-none motion-reduce:scale-x-100
                  md:group-hover:scale-x-100 md:group-hover:bg-[#e9c176]/80
                "
              />

              {/* CTA — solo color (evita reflow por letter-spacing) */}
              <span
                className="
                  font-inter inline-block mt-4
                  text-[10px] uppercase tracking-[0.3em]
                  text-[#e9c176]
                  drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]
                  transition-colors duration-500 ease-out
                  motion-reduce:transition-none
                  md:group-hover:text-[#f0cf92]
                  animate-fade-in motion-reduce:animate-none
                "
              >
                Ver detalle
              </span>
            </>
          )}
        </div>
        {/* Degradado inferior translúcido — funde sin tapar imágenes claras */}
        <div
          aria-hidden="true"
          className="h-20 bg-gradient-to-b from-black/55 via-black/30 to-transparent backdrop-blur-[3px]"
        />
      </div>
    </a>
  );
};

const FuneralPlansSection = () => {
  return (
    <section
      id="planes-funerarios"
      aria-labelledby="planes-funerarios-title"
      className="bg-black pt-20 pb-20 md:pt-24 md:pb-24"
    >
      <div className="mx-auto w-full max-w-[1680px] px-6 md:px-10 xl:px-14">
        {/* Header editorial */}
        <header className="text-center mb-12 md:mb-16">
          <h2
            id="planes-funerarios-title"
            className="font-playfair text-[#e8e2d8] text-3xl md:text-4xl lg:text-[2.6rem] font-normal tracking-tight"
          >
            Planes Funerarios
          </h2>
          <span
            aria-hidden="true"
            className="mt-5 inline-block h-px w-12 bg-[#e9c176]/70"
          />
          <p className="mx-auto mt-6 max-w-2xl font-inter text-[15px] md:text-[15.5px] leading-relaxed text-[#c4c7c7]">
            Acompañamos a cada familia con dignidad, cercanía y respeto. Conozca nuestras alternativas de servicio funerario, diseñadas para entregar tranquilidad y un cuidado humano en cada detalle.
          </p>
        </header>

        {/* Lista — mobile: scroll snap | md+: grid 7 columnas */}
        <ul
          className="
            flex gap-3 overflow-x-auto snap-x snap-mandatory
            -mx-6 px-6 pb-2
            [scrollbar-width:none] [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
            md:mx-0 md:px-0 md:pb-0 md:overflow-visible md:snap-none
            md:grid md:grid-cols-3 md:gap-3
            lg:grid-cols-4
            xl:grid-cols-7 xl:gap-2
          "
        >
          {PLANS.map((plan, index) => (
            <li
              key={plan.id}
              className="
                shrink-0 snap-start basis-[78vw] sm:basis-[55vw]
                md:basis-auto md:shrink md:snap-align-none
              "
            >
              <FuneralPlanCard plan={plan} priority={index === 0} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FuneralPlansSection;
