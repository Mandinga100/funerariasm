import { useEffect, useState, useMemo } from "react";
import OptimizedImage from "@/components/ui/optimized-image";
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryImage } from "@/lib/blog-categories";
import BlogCategoryFilter from "@/components/BlogCategoryFilter";
import { Calendar, Tag, ArrowRight } from "lucide-react";

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

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image, category, tags, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(12);
      if (data && data.length > 0) setAllPosts(data as BlogPost[]);
    };
    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    let result = allPosts;
    if (activeFilter) {
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
      result = allPosts.filter((p) => {
        const cat = p.category ? normalize(p.category) : "";
        return cat === activeFilter;
      });
    } else {
      // Default "Todos": pick the most relevant (most recent) post from each category in filter order
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
      const categoryOrder = ["guias", "servicios", "duelo", "prevision", "contencion-emocional", "salud-mental", "apoyo-familiar"];
      
      // Group posts by normalized category
      const byCategory = new Map<string, BlogPost[]>();
      for (const p of allPosts) {
        const cat = p.category ? normalize(p.category) : "other";
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(p);
      }
      // Sort each group by date descending (most recent = most relevant)
      for (const posts of byCategory.values()) {
        posts.sort((a, b) => {
          const da = a.published_at ? new Date(a.published_at).getTime() : 0;
          const db = b.published_at ? new Date(b.published_at).getTime() : 0;
          return db - da;
        });
      }
      // Round-robin: pick top post from each category in order, then second, etc.
      const ordered: BlogPost[] = [];
      const usedIds = new Set<string>();
      let round = 0;
      const maxRounds = Math.max(...Array.from(byCategory.values()).map(v => v.length), 0);
      while (ordered.length < allPosts.length && round < maxRounds) {
        for (const cat of categoryOrder) {
          const catPosts = byCategory.get(cat);
          if (catPosts && catPosts[round] && !usedIds.has(catPosts[round].id)) {
            ordered.push(catPosts[round]);
            usedIds.add(catPosts[round].id);
          }
        }
        // Also include "other" categories not in the predefined order
        for (const [cat, catPosts] of byCategory) {
          if (!categoryOrder.includes(cat) && catPosts[round] && !usedIds.has(catPosts[round].id)) {
            ordered.push(catPosts[round]);
            usedIds.add(catPosts[round].id);
          }
        }
        round++;
      }
      result = ordered;
    }
    return result.slice(0, 6);
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

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No hay artículos en esta categoría aún.</p>
            </div>
          ) : (
            filteredPosts.map((post, index) => {
              const image = post.cover_image || getCategoryImage(post.category);
              const mobileHidden = index >= 3 ? "hidden sm:block" : "";
              return (
                <Link
                  key={post.id}
                  to={post.slug === "#" ? "/blog" : `/blog/${post.slug}`}
                  className={`group bg-background rounded-lg overflow-hidden border border-border/50 hover:border-gold/30 transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)] ${mobileHidden}`}
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
