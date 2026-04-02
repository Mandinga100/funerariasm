import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { Link } from "react-router-dom";

const GALLERIES = [
  { src: "/assets/images/otros/acacia1.webp", label: "Capilla Interior" },
  { src: "/assets/images/otros/acacia2.webp", label: "Sala Privada" },
  { src: "/assets/images/otros/acacia3.webp", label: "Jardín Memorial" },
];

const MemorialesSection = () => {
  const headerRef = useScrollReveal();
  const galleryRef = useScrollReveal(0.1, "0px 0px -40px 0px");

  return (
    <section id="memoriales" className="py-24 bg-background">
      <div className="container">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Espacios del Recuerdo</p>
          <h2 className="text-section font-playfair italic text-foreground mb-4">
            Memoriales
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Espacios diseñados para el recuerdo eterno. Honra la memoria de tus seres queridos con un memorial digital único.
          </p>
        </div>

        <div ref={galleryRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {GALLERIES.map((g) => (
            <div key={g.label} className="group relative rounded-lg overflow-hidden aspect-[4/3]">
              <img
                src={g.src}
                alt={g.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-brand-slow"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/70 to-transparent" />
              <p className="absolute bottom-4 left-4 text-primary-foreground text-sm font-medium tracking-wide-brand">
                {g.label}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/obituarios"
            className="group inline-flex items-center gap-2 text-gold hover:text-gold-light text-sm tracking-wide-brand uppercase transition-brand"
          >
            Ver Obituarios{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MemorialesSection;
