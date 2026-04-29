/**
 * FuneralPlansSection
 * --------------------------------------------------------------
 * Sección editorial premium con 7 planes funerarios.
 * - Mobile: scroll horizontal con snap.
 * - Tablet: grid 3 columnas.
 * - Desktop (xl+): grid editorial de 7 columnas.
 * No depende de navbar/footer/layout/backend.
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
        group relative block aspect-[3/5] overflow-hidden rounded-sm
        bg-[#1e1b16] border border-[rgba(142,145,146,0.22)]
        transition-colors duration-500 ease-out
        focus:outline-none focus-visible:ring-1 focus-visible:ring-[#e9c176]
        focus-visible:ring-offset-2 focus-visible:ring-offset-[#15130e]
        md:hover:bg-[#2c2a24] md:hover:border-[#e9c176]/40
      "
    >
      {/* Imagen full-bleed */}
      <img
        src={plan.image}
        alt={`Imagen del Plan ${plan.name}`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay oscuro constante (legibilidad editorial) */}
      <div
        aria-hidden="true"
        className="
          absolute inset-0
          bg-gradient-to-t from-black/85 via-black/45 to-black/15
          transition-opacity duration-500 ease-out
          md:group-hover:from-black/75
        "
      />

      {/* Contenido al pie */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-center">
        <h3 className="font-playfair text-[#e8e2d8] text-xl leading-tight">
          {plan.name}
        </h3>
        <p className="font-inter text-sm text-[#c4c7c7] mt-1.5 tracking-tight">
          {plan.price}
        </p>
        <span
          className="
            font-inter inline-block mt-5
            text-[10px] uppercase tracking-[0.25em]
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
      className="bg-[#15130e] py-24 md:py-32"
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
        {/* Header editorial */}
        <header className="text-center mb-16 md:mb-20">
          <h2
            id="planes-funerarios-title"
            className="font-playfair text-[#e8e2d8] text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight"
          >
            Planes Funerarios
          </h2>
          <span
            aria-hidden="true"
            className="mt-6 inline-block h-px w-12 bg-[#e9c176]/70"
          />
        </header>

        {/* Lista — mobile: scroll snap | md+: grid */}
        <ul
          className="
            flex gap-4 overflow-x-auto snap-x snap-mandatory
            -mx-6 px-6 pb-2
            [scrollbar-width:none] [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
            md:mx-0 md:px-0 md:pb-0 md:overflow-visible md:snap-none
            md:grid md:grid-cols-3 md:gap-5
            lg:grid-cols-4
            xl:grid-cols-7 xl:gap-4
          "
        >
          {PLANS.map((plan) => (
            <li
              key={plan.id}
              className="
                shrink-0 snap-start basis-[82vw]
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
