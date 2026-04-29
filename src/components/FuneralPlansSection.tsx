/**
 * FuneralPlansSection
 * --------------------------------------------------------------
 * Sección editorial premium con 7 planes funerarios.
 * Diseño basado en la referencia AETERNA: cards verticales muy altas,
 * imagen difuminada hacia el fondo, bloque de info al pie.
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
        group relative block overflow-hidden rounded-sm
        bg-[#1e1b16] border border-[rgba(142,145,146,0.18)]
        h-[460px] sm:h-[520px] md:h-[640px] lg:h-[680px] xl:h-[720px]
        transition-colors duration-500 ease-out
        focus:outline-none focus-visible:ring-1 focus-visible:ring-[#e9c176]
        focus-visible:ring-offset-2 focus-visible:ring-offset-[#15130e]
        md:hover:bg-[#2c2a24] md:hover:border-[#e9c176]/30
      "
    >
      {/* Imagen — ocupa toda la card, difuminada hacia abajo */}
      <img
        src={plan.image}
        alt={`Imagen del Plan ${plan.name}`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />

      {/* Difuminado profundo hacia el fondo de la card (estilo AETERNA) */}
      <div
        aria-hidden="true"
        className="
          absolute inset-0
          bg-gradient-to-b
          from-[#1e1b16]/45 via-[#1e1b16]/85 to-[#1e1b16]
          transition-opacity duration-500 ease-out
        "
      />

      {/* Capa adicional para sellar el bloque de info inferior */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/5 bg-[#1e1b16]"
      />

      {/* Contenido al pie */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-7 pt-6 text-center">
        <h3 className="font-playfair text-[#e8e2d8] text-[1.35rem] leading-tight">
          {plan.name}
        </h3>
        <p className="font-inter text-[15px] text-[#c4c7c7] mt-2 tracking-tight">
          {plan.price}
        </p>

        {/* Divisor sutil */}
        <span
          aria-hidden="true"
          className="block mx-auto mt-5 h-px w-8 bg-[rgba(142,145,146,0.25)]"
        />

        <span
          className="
            font-inter inline-block mt-5
            text-[10px] uppercase tracking-[0.28em]
            text-[#e9c176] transition-colors duration-300
            md:group-hover:text-[#f0cf92]
          "
        >
          Ver detalle
        </span>
      </div>
    </a>
  );
};

const FuneralPlansSection = () => {
  return (
    <section
      id="planes-funerarios"
      aria-labelledby="planes-funerarios-title"
      className="bg-[#15130e] pt-28 pb-20 md:pt-36 md:pb-28"
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
