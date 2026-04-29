/**
 * FuneralPlansSection
 * --------------------------------------------------------------
 * Cards verticales editoriales con nombre del plan centrado verticalmente,
 * precio + CTA al pie y animaciones premium al hover.
 */

type FuneralPlan = {
  id: string;
  name: string;
  price: string;
  image: string;
  href: string;
};

const PLANS: readonly FuneralPlan[] = [
  { id: "margarita", name: "Margarita", price: "$1.290.000", image: "/assets/images/planes/plan-margarita.jpg", href: "/planes#margarita" },
  { id: "azucena",   name: "Azucena",   price: "$1.390.000", image: "/assets/images/planes/plan-azucena.jpg",   href: "/planes#azucena" },
  { id: "acacia",    name: "Acacia",    price: "$1.990.000", image: "/assets/images/planes/plan-acacia.jpg",    href: "/planes#acacia" },
  { id: "orquidea",  name: "Orquídea",  price: "$1.990.000", image: "/assets/images/planes/plan-orquidea.jpg",  href: "/planes#orquidea" },
  { id: "jazmin",    name: "Jazmín",    price: "$2.790.000", image: "/assets/images/planes/plan-jazmin.jpg",    href: "/planes#jazmin" },
  { id: "castano",   name: "Castaño",   price: "$3.990.000", image: "/assets/images/planes/plan-castano.jpg",   href: "/planes#castano" },
  { id: "rauli",     name: "Raulí",     price: "$3.990.000", image: "/assets/images/planes/plan-rauli.jpg",     href: "/planes#rauli" },
] as const;

interface FuneralPlanCardProps {
  plan: FuneralPlan;
}

const FuneralPlanCard = ({ plan }: FuneralPlanCardProps) => {
  return (
    <a
      href={plan.href}
      aria-label={`Ver detalle del Plan ${plan.name}`}
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
      {/* Imagen — solo se ilumina sutilmente al hover (sin zoom) */}
      <img
        src={plan.image}
        alt={`Imagen del Plan ${plan.name}`}
        loading="lazy"
        decoding="async"
        className="
          absolute inset-0 h-full w-full object-cover
          opacity-80 saturate-[0.85] brightness-90
          transition-[filter,opacity] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]
          md:group-hover:opacity-100 md:group-hover:saturate-100 md:group-hover:brightness-110
        "
      />

      {/* Velo base oscuro para profundidad */}
      <div
        aria-hidden="true"
        className="
          absolute inset-0
          bg-gradient-to-b from-black/60 via-black/20 to-black/85
          transition-opacity duration-700 ease-out
          md:group-hover:opacity-70
        "
      />

      {/* Línea dorada inferior que se revela al hover */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-x-6 bottom-0 h-px
          bg-gradient-to-r from-transparent via-[#e9c176] to-transparent
          origin-center scale-x-0 opacity-0
          transition-[transform,opacity] duration-700 ease-out
          md:group-hover:scale-x-100 md:group-hover:opacity-90
        "
      />

      {/* Nombre del plan — centrado verticalmente */}
      <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
        <h3
          className="
            font-playfair text-[#e8e2d8] text-center
            text-[1.7rem] md:text-[2rem] lg:text-[2.15rem] leading-tight
            drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]
            transition-[color,letter-spacing] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
            md:group-hover:text-[#f4ead2]
            md:group-hover:tracking-[0.02em]
          "
        >
          {plan.name}
        </h3>
      </div>

      {/*
        CORTINA — Precio + CTA
        En reposo: anclada al fondo (translate-y-0).
        En hover: sube hasta justo debajo del nombre del plan, sin tapar imagen ni título.
        Tope superior con degradado negro→transparente para fundirse de forma elegante.
      */}
      <div
        className="
          absolute inset-x-0 bottom-0
          translate-y-0
          transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]
          will-change-transform
          md:group-hover:-translate-y-[42%]
        "
      >
        {/* Degradado superior de la cortina */}
        <div
          aria-hidden="true"
          className="h-20 bg-gradient-to-t from-black via-black/80 to-transparent"
        />
        {/* Cuerpo sólido negro */}
        <div className="bg-black px-5 pb-7 pt-2 text-center">
          <p
            className="
              font-inter text-[15px] text-[#c4c7c7] tracking-tight
              transition-colors duration-500
              md:group-hover:text-[#e8e2d8]
            "
          >
            {plan.price}
          </p>

          {/* Divisor que se expande al hover */}
          <span
            aria-hidden="true"
            className="
              block mx-auto mt-4 h-px w-8 bg-[rgba(142,145,146,0.3)]
              transition-[width,background-color] duration-700 ease-out
              md:group-hover:w-16 md:group-hover:bg-[#e9c176]/70
            "
          />

          {/* CTA */}
          <span
            className="
              font-inter inline-block mt-4
              text-[10px] uppercase tracking-[0.28em]
              text-[#e9c176]
              transition-[color,letter-spacing] duration-500 ease-out
              md:group-hover:text-[#f0cf92]
              md:group-hover:tracking-[0.32em]
            "
          >
            Ver detalle
          </span>
        </div>
      </div>
    </a>
  );
};

const FuneralPlansSection = () => {
  return (
    <section
      id="planes-funerarios"
      aria-labelledby="planes-funerarios-title"
      className="bg-black pt-28 pb-20 md:pt-36 md:pb-28"
    >
      <div className="mx-auto w-full max-w-[1680px] px-6 md:px-10 xl:px-14">
        {/* Header editorial */}
        <header className="text-center mb-14 md:mb-20">
          <h2
            id="planes-funerarios-title"
            className="font-playfair text-[#e8e2d8] text-3xl md:text-4xl lg:text-[2.6rem] font-normal tracking-tight"
          >
            Planes Funerarios
          </h2>
          <span
            aria-hidden="true"
            className="mt-6 inline-block h-px w-12 bg-[#e9c176]/70"
          />
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
          {PLANS.map((plan) => (
            <li
              key={plan.id}
              className="
                shrink-0 snap-start basis-[78vw] sm:basis-[55vw]
                md:basis-auto md:shrink md:snap-align-none
              "
            >
              <FuneralPlanCard plan={plan} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FuneralPlansSection;
