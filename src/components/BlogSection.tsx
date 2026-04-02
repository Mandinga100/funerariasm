import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";
import { Link } from "react-router-dom";

const POSTS = [
  {
    title: "¿Qué hacer ante un fallecimiento? Guía paso a paso",
    excerpt: "Orientación profesional para enfrentar los primeros momentos con claridad y apoyo.",
    image: "/assets/images/otros/about.webp",
    slug: "#",
  },
  {
    title: "La importancia de la previsión funeraria",
    excerpt: "Planificar con anticipación es un acto de amor hacia quienes más queremos.",
    image: "/assets/images/otros/clouds.webp",
    slug: "#",
  },
  {
    title: "Ceremonias personalizadas: honrando una vida única",
    excerpt: "Cómo crear una despedida que refleje la esencia y valores de su ser querido.",
    image: "/assets/images/otros/respeto.webp",
    slug: "#",
  },
];

const BlogSection = () => {
  const headerRef = useScrollReveal();
  const gridRef = useStaggerReveal(100);

  return (
    <section id="blog" className="py-24 bg-card">
      <div className="container">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Nuestro Blog</p>
          <h2 className="text-section font-playfair italic text-foreground mb-4">
            Artículos y Orientación
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Información, guía y contención para acompañarle en cada etapa.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {POSTS.map((post) => (
            <article
              key={post.title}
              className="group bg-background rounded-lg overflow-hidden border border-border/50 hover:border-gold/30 transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-brand-slow"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="font-playfair text-lg text-foreground mb-2 leading-snug">{post.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
                <span className="text-gold text-xs tracking-wide-brand uppercase group-hover:text-gold-light transition-brand">
                  Leer más →
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/blog"
            className="group inline-flex items-center gap-2 text-gold hover:text-gold-light text-sm tracking-wide-brand uppercase transition-brand"
          >
            Ver todos los artículos{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
