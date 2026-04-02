import { Link } from "react-router-dom";
import { Check, Star } from "lucide-react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";

const PLANS = [
  {
    id: "margarita",
    name: "Plan Margarita",
    price: "$1.290.000",
    features: ["Urna Estándar", "Soporte Administrativo", "Capilla Básica", "Libro Condolencias"],
    highlighted: false,
  },
  {
    id: "azucena",
    name: "Plan Azucena",
    price: "$1.360.000",
    features: ["Cofre Estándar Lineal", "Traslado Local Inmediato", "Capilla Pública/Domicilio", "Trámites Civiles"],
    highlighted: false,
  },
  {
    id: "rosal",
    name: "Plan Rosal Abelia",
    price: "$1.750.000",
    features: ["Cofre Especial", "Atención 24/7", "Sala Velación 12h", "Arreglo Floral"],
    highlighted: false,
  },
  {
    id: "quillay",
    name: "Plan Quillay",
    price: "$2.390.000",
    features: ["Madera Barnizada Quillay", "Sala Velación 12h", "Carroza Estándar", "Asesoría Familiar"],
    highlighted: false,
  },
  {
    id: "raul",
    name: "Plan Raúl Premium",
    price: "$3.590.000",
    features: ["Maderas Importación Raúl", "Suite Presidencial 24h", "Cortejo VIP Mercedes-Benz", "Memorial de Vida 4K"],
    highlighted: true,
  },
];

const PlansSection = () => {
  const headerRef = useScrollReveal();
  const gridRef = useStaggerReveal(100);

  return (
    <section id="planes" className="py-24 bg-primary text-primary-foreground">
      <div className="container">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Planes Funerarios</p>
          <h2 className="text-section font-playfair italic mb-4">
            Opciones para cada necesidad
          </h2>
          <p className="text-primary-foreground/60 max-w-2xl mx-auto">
            Cada plan está diseñado para brindar tranquilidad y acompañamiento, adaptándose a las necesidades de cada familia.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`group rounded-lg p-6 transition-brand ${
                plan.highlighted
                  ? "bg-gold/10 border-2 border-gold relative hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.3)]"
                  : "bg-primary-foreground/5 border border-primary-foreground/10 hover:border-gold/30 hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.1)]"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gold text-primary-foreground px-3 py-1 rounded-full text-[10px] tracking-wide-brand uppercase font-semibold">
                  <Star className="w-3 h-3" /> Destacado
                </div>
              )}
              <h3 className="font-playfair text-lg mb-1">{plan.name}</h3>
              <p className="text-gold text-2xl font-semibold font-inter mb-6">{plan.price}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-primary-foreground/70">
                    <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={`/planes#${plan.id}`}
                className={`group/btn block text-center py-3 rounded-full text-sm tracking-wide-brand uppercase transition-brand ${
                  plan.highlighted
                    ? "bg-gold text-primary-foreground hover:bg-gold-dark hover:shadow-[0_6px_20px_-4px_hsl(var(--gold)/0.4)]"
                    : "border border-gold/40 text-gold hover:bg-gold hover:text-primary-foreground hover:shadow-[0_6px_20px_-4px_hsl(var(--gold)/0.3)]"
                }`}
              >
                Cotizar este plan
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/planes"
            className="group text-gold hover:text-gold-light text-sm tracking-wide-brand uppercase transition-brand"
          >
            Ver todos los planes y detalles{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PlansSection;
