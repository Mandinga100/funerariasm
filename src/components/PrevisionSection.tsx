import { Shield, Users, Sparkles } from "lucide-react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";

const BENEFITS = [
  {
    icon: Shield,
    title: "Precios Congelados",
    description: "Proteja su patrimonio de la inflación futura. El costo pactado hoy se mantiene vigente.",
  },
  {
    icon: Users,
    title: "Tranquilidad Familiar",
    description: "Evite que los suyos enfrenten decisiones complejas en el momento más vulnerable.",
  },
  {
    icon: Sparkles,
    title: "Voluntad Respetada",
    description: "Diseñe hoy su homenaje póstumo según sus valores y preferencias.",
  },
];

const PrevisionSection = () => {
  const headerRef = useScrollReveal();
  const gridRef = useStaggerReveal(100);

  return (
    <section id="prevision" className="py-24 bg-primary text-primary-foreground">
      <div className="container">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Protocolo Vitalicio</p>
          <h2 className="text-section font-playfair italic mb-4">
            La Paz de Saber Decidir
          </h2>
          <p className="text-primary-foreground/60 max-w-2xl mx-auto italic mb-8">
            "Un legado se construye con amor, pero se protege con previsión."
          </p>
          <a
            href={buildWhatsAppUrlDirect("Hola, me interesa conocer los planes de previsión anticipada.")}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-gold hover:text-gold-light text-sm tracking-wide-brand uppercase transition-brand"
          >
            Explorar Previsión{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="group text-center p-6 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 hover:border-gold/30 transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.1)]"
            >
              <b.icon className="w-8 h-8 text-gold mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
              <h3 className="font-playfair text-lg mb-2">{b.title}</h3>
              <p className="text-sm text-primary-foreground/60 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto text-center">
          {[
            { value: "24/7", label: "Disponibilidad" },
            { value: "+5000", label: "Familias Atendidas" },
            { value: "30", label: "Años de Excelencia" },
            { value: "100%", label: "Satisfacción" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-semibold text-gold font-inter">{s.value}</p>
              <p className="text-xs text-primary-foreground/50 uppercase tracking-wide-brand mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PrevisionSection;
