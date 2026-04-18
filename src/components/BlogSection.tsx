import { useEffect, useState, useMemo, useRef } from "react";
import OptimizedImage from "@/components/ui/optimized-image";
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryImage } from "@/lib/blog-categories";
import BlogCategoryFilter from "@/components/BlogCategoryFilter";
import { Calendar, Tag, ArrowRight } from "lucide-react";

const POSTS_PER_VIEW = 6;
const normalizeKey = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[];
  published_at: string | null;
}

const FALLBACK_POSTS: BlogPost[] = [
  {
    id: "1",
    title: "¿Qué hacer ante un fallecimiento? Guía paso a paso",
    slug: "#",
    excerpt: "Orientación profesional para enfrentar los primeros momentos con claridad y apoyo.",
    cover_image: "/assets/images/brand/logo.webp",
    category: "Guías",
    tags: [],
    published_at: null,
  },
  {
    id: "2",
    title: "La importancia de la previsión funeraria",
    slug: "#",
    excerpt: "Planificar con anticipación es un acto de amor hacia quienes más queremos.",
    cover_image: "/assets/images/otros/calidad.webp",
    category: "Previsión",
    tags: [],
    published_at: null,
  },
  {
    id: "3",
    title: "Ceremonias personalizadas: honrando una vida única",
    slug: "#",
    excerpt: "Cómo crear una despedida que refleje la esencia y valores de su ser querido.",
    cover_image: "/assets/images/servicios/funerales-gala.webp",
    category: "Servicios",
    tags: [],
    published_at: null,
  },
];

const BlogSection = () => {
  const headerRef = useScrollReveal();
  const gridRef = useStaggerReveal(100);
  const [allPosts, setAllPosts] = useState<BlogPost[]>(FALLBACK_POSTS);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [transitionKey, setTransitionKey] = useState(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const fetchPosts = async () => {
      // Fetch a healthy pool so each category has enough posts to surface 6 relevant ones.
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image, category, tags, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(80);
      if (data && data.length > 0) setAllPosts(data as BlogPost[]);
    };
    fetchPosts();
  }, []);

  // Bump key whenever the filter changes so the grid re-mounts and re-runs its enter animation.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setTransitionKey((k) => k + 1);
  }, [activeFilter]);

  const filteredPosts = useMemo(() => {
    // Lógica idéntica a /blog (Blog.tsx): match estricto por categoría normalizada,
    // ordenado por fecha desc (proxy de relevancia) y limitado a 6.
    const categoryOrder = [
      "novedades", "guias", "servicios", "duelo", "prevision",
      "contencion-emocional", "salud-mental", "apoyo-familiar",
    ];

    if (activeFilter) {
      const result = allPosts.filter((p) => {
        const cat = p.category ? normalizeKey(p.category) : "";
        return cat === activeFilter;
      });
      result.sort((a, b) => {
        const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
        const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
        return dateB - dateA;
      });
      return result.slice(0, POSTS_PER_VIEW);
    }

    // "Todos": round-robin entre categorías, lo más reciente de cada una primero.
    const byCategory = new Map<string, BlogPost[]>();
    for (const p of allPosts) {
      const cat = p.category ? normalizeKey(p.category) : "other";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(p);
    }
    for (const group of byCategory.values()) {
      group.sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });
    }
    const ordered: BlogPost[] = [];
    const usedIds = new Set<string>();
    const maxRounds = Math.max(0, ...Array.from(byCategory.values()).map((v) => v.length));
    for (let round = 0; round < maxRounds && ordered.length < POSTS_PER_VIEW; round++) {
      for (const cat of categoryOrder) {
        const post = byCategory.get(cat)?.[round];
        if (post && !usedIds.has(post.id)) {
          ordered.push(post);
          usedIds.add(post.id);
          if (ordered.length >= POSTS_PER_VIEW) break;
        }
      }
      if (ordered.length >= POSTS_PER_VIEW) break;
      for (const [cat, catPosts] of byCategory) {
        if (categoryOrder.includes(cat)) continue;
        const post = catPosts[round];
        if (post && !usedIds.has(post.id)) {
          ordered.push(post);
          usedIds.add(post.id);
          if (ordered.length >= POSTS_PER_VIEW) break;
        }
      }
    }
    return ordered.slice(0, POSTS_PER_VIEW);
  }, [allPosts, activeFilter]);

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

        <BlogCategoryFilter active={activeFilter} onChange={setActiveFilter} />

        <div
          key={transitionKey}
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-5xl mx-auto blog-grid-fade"
        >
          {filteredPosts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No hay artículos en esta categoría aún.</p>
            </div>
          ) : (
            filteredPosts.map((post, index) => {
              const image = post.cover_image || getCategoryImage(post.category);
              return (
                <Link
                  key={post.id}
                  to={post.slug === "#" ? "/blog" : `/blog/${post.slug}`}
                  style={{ animationDelay: `${index * 70}ms` }}
                  className="blog-card-enter group bg-background rounded-lg overflow-hidden border border-border/50 hover:border-gold/30 transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    <OptimizedImage
                      src={image}
                      alt={post.title}
                      width={800}
                      height={500}
                      className="w-full h-full object-cover group-hover:scale-105 transition-brand-slow"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                      {post.category && (
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {post.category}</span>
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
              );
            })
          )}
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
