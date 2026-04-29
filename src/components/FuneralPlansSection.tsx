/**
 * FuneralPlansSection
 * --------------------------------------------------------------
 * Cards verticales editoriales con nombre del plan centrado verticalmente,
 * precio + CTA al pie y animaciones premium al hover.
 */
import { useState } from "react";

/** LQIP base64 (24x36 ~700B) del primer plan — evita salto visual durante el LCP */
const MARGARITA_BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABgDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAQFBv/EACIQAAICAgEDBQAAAAAAAAAAAAECAxEABDESIYEFE1Fxkf/EABcBAAMBAAAAAAAAAAAAAAAAAAECAwT/xAAbEQACAwADAAAAAAAAAAAAAAAAAQIDERMxUf/aAAwDAQACEQMRAD8Ay8VEsWPbn8yxoumurGF2WWq6i1Dvk3WkSSVvlr4Fdqx8rq66t7tySGiVVaA85mslg6WLRvq009NlYyM85BKkm/vDIkm3asvQqrwFA4884YY1tdlOVeH/2Q==";

type FuneralPlan = {
  id: string;
  name: string;
  price: string;
  image: string;
  href: string;
  blurDataURL?: string;
};

const PLANS: readonly FuneralPlan[] = [
  { id: "margarita", name: "Margarita", price: "$1.290.000", image: "/assets/images/planes/plan-margarita.jpg", href: "/planes#margarita", blurDataURL: MARGARITA_BLUR },
  { id: "azucena",   name: "Azucena",   price: "$1.390.000", image: "/assets/images/planes/plan-azucena.jpg",   href: "/planes#azucena" },
  { id: "acacia",    name: "Acacia",    price: "$1.990.000", image: "/assets/images/planes/plan-acacia.jpg",    href: "/planes#acacia" },
  { id: "orquidea",  name: "Orquídea",  price: "$1.990.000", image: "/assets/images/planes/plan-orquidea.jpg",  href: "/planes#orquidea" },
  { id: "jazmin",    name: "Jazmín",    price: "$2.790.000", image: "/assets/images/planes/plan-jazmin.jpg",    href: "/planes#jazmin" },
  { id: "castano",   name: "Castaño",   price: "$3.990.000", image: "/assets/images/planes/plan-castano.jpg",   href: "/planes#castano" },
  { id: "rauli",     name: "Raulí",     price: "$3.990.000", image: "/assets/images/planes/plan-rauli.jpg",     href: "/planes#rauli" },
] as const;

interface FuneralPlanCardProps {
  plan: FuneralPlan;
  priority?: boolean;
}

const FuneralPlanCard = ({ plan, priority = false }: FuneralPlanCardProps) => {
  const [loaded, setLoaded] = useState(false);
  const hasBlur = Boolean(plan.blurDataURL);

  return (
    <a
      href={plan.href}
      aria-label={`Ver detalle del Plan ${plan.name}`}
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
        className={`
          absolute inset-0 h-full w-full object-cover
          transition-opacity duration-700 ease-out
          ${hasBlur && !loaded ? "opacity-0" : "opacity-80"}
          md:group-hover:opacity-100
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
          md:group-hover:opacity-90
        "
      />

      {/* Nombre del plan */}
      <div className="absolute inset-x-0 top-[34%] flex items-center justify-center px-4 pointer-events-none md:top-[30%]">
        <h3
          className="
            font-playfair text-[#e8e2d8] text-center
            text-[1.7rem] md:text-[2rem] lg:text-[2.15rem] leading-tight
            drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]
            transition-colors duration-500 ease-out
            md:group-hover:text-[#f4ead2]
          "
        >
          {plan.name}
        </h3>
      </div>

      {/*
        CORTINA — Precio + CTA
        Sube hasta justo bajo el nombre del plan, con difuminado superior e inferior.
      */}
      <div
        className="
          absolute inset-x-0 bottom-0
          translate-y-0
          transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]
          will-change-transform
          md:group-hover:-translate-y-[48%]
        "
      >
        {/* Degradado superior — más alto y suave */}
        <div
          aria-hidden="true"
          className="h-32 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
        />
        {/* Cuerpo translúcido — blur ligero para mejor rendimiento */}
        <div className="bg-gradient-to-b from-black/70 via-black/80 to-black/70 px-5 pb-6 pt-3 text-center backdrop-blur-[3px]">
          <p
            className="
              font-inter text-[15px] text-[#c4c7c7] tracking-tight
              transition-colors duration-500 ease-out
              md:group-hover:text-[#e8e2d8]
            "
          >
            {plan.price}
          </p>

          {/* Divisor — animado por transform (GPU) en lugar de width */}
          <span
            aria-hidden="true"
            className="
              block mx-auto mt-4 h-px w-16 bg-[rgba(142,145,146,0.3)]
              origin-center scale-x-50
              transition-[transform,background-color] duration-700 ease-out
              md:group-hover:scale-x-100 md:group-hover:bg-[#e9c176]/70
            "
          />

          {/* CTA — solo color (evita reflow por letter-spacing) */}
          <span
            className="
              font-inter inline-block mt-4
              text-[10px] uppercase tracking-[0.3em]
              text-[#e9c176]
              transition-colors duration-500 ease-out
              md:group-hover:text-[#f0cf92]
            "
          >
            Ver detalle
          </span>
        </div>
        {/* Degradado inferior — funde con el fondo */}
        <div
          aria-hidden="true"
          className="h-16 bg-gradient-to-b from-black/70 via-black/85 to-black"
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
