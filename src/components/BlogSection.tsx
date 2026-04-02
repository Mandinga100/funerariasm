import { useEffect, useState } from "react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Tag, ArrowRight } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string | null;
  published_at: string | null;
}

const FALLBACK_POSTS = [
  {
    id: "1",
    title: "¿Qué hacer ante un fallecimiento? Guía paso a paso",
    slug: "#",
    excerpt: "Orientación profesional para enfrentar los primeros momentos con claridad y apoyo.",
    cover_image: "/assets/images/otros/about.webp",
    category: "Guías",
    published_at: null,
  },
  {
    id: "2",
    title: "La importancia de la previsión funeraria",
    slug: "#",
    excerpt: "Planificar con anticipación es un acto de amor hacia quienes más queremos.",
    cover_image: "/assets/images/otros/clouds.webp",
    category: "Previsión",
    published_at: null,
  },
  {
    id: "3",
    title: "Ceremonias personalizadas: honrando una vida única",
    slug: "#",
    excerpt: "Cómo crear una despedida que refleje la esencia y valores de su ser querido.",
    cover_image: "/assets/images/otros/respeto.webp",
    category: "Servicios",
    published_at: null,
  },
];

const BlogSection = () => {
  const headerRef = useScrollReveal();
  const gridRef = useStaggerReveal(100);
  const [posts, setPosts] = useState<BlogPost[]>(FALLBACK_POSTS);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image, category, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      if (data && data.length > 0) setPosts(data as BlogPost[]);
    };
    fetchPosts();
  }, []);

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
          {posts.map((post) => (
            <Link
              key={post.id}
              to={post.slug === "#" ? "/blog" : `/blog/${post.slug}`}
              className="group bg-background rounded-lg overflow-hidden border border-border/50 hover:border-gold/30 transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
            >
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                {post.cover_image ? (
                  <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-brand-slow" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 to-gold/10 flex items-center justify-center">
                    <span className="text-gold/40 font-playfair text-4xl italic">SM</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                  {post.category && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {post.category}
                    </span>
                  )}
                  {post.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.published_at).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
                <h3 className="font-playfair text-lg text-foreground mb-2 leading-snug group-hover:text-gold transition-brand">{post.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-gold text-xs tracking-wide-brand uppercase group-hover:gap-2 transition-all duration-300">
                  Leer más <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
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
