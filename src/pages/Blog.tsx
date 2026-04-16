import { useEffect, useState, useMemo } from "react";
import OptimizedImage from "@/components/ui/optimized-image";
import { Link, useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import BlogCategoryFilter from "@/components/BlogCategoryFilter";
import { getCategoryImage } from "@/lib/blog-categories";
import { Calendar, Tag, ArrowRight } from "lucide-react";
import { buildBreadcrumbJsonLd } from "@/lib/seo-schemas";

const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: "Blog", path: "/blog" }]);

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[];
  published_at: string | null;
  author_name: string | null;
}

const SITE_URL = "https://funerariasantamargarita.cl";

const Blog = () => {
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<string | null>(searchParams.get("cat"));

  const handleFilterChange = (filter: string | null) => {
    setActiveFilter(filter);
    if (filter) {
      setSearchParams({ cat: filter }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  useEffect(() => {
    const title = "Blog — Guías y Orientación Funeraria | Funeraria Santa Margarita";
    const desc = "Artículos, guías y orientación sobre servicios funerarios, previsión y duelo. Funeraria Santa Margarita, Santiago, Chile.";
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", desc);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", `${SITE_URL}/blog`);

    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image, category, tags, published_at, author_name")
        .eq("published", true)
        .order("published_at", { ascending: false });
      setPosts((data as BlogPost[]) || []);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const maxCards = activeFilter ? (isMobile ? 3 : 6) : undefined;

  const filteredPosts = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
    const categoryOrder = ["novedades", "guias", "servicios", "duelo", "prevision", "contencion-emocional", "salud-mental", "apoyo-familiar"];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (activeFilter) {
      let result: BlogPost[];
      if (activeFilter === "novedades") {
        result = posts.filter((p) => p.published_at && new Date(p.published_at) >= thirtyDaysAgo);
      } else {
        result = posts.filter((p) => {
          const cat = p.category ? normalize(p.category) : "";
          return cat === activeFilter;
        });
      }
      // Sort by trending: most recent first (proxy for relevance)
      result.sort((a, b) => {
        const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
        const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
        return dateB - dateA;
      });
      return result.slice(0, maxCards);
    }

    // Default "Todos": round-robin picking the most relevant post from each category in filter order
    const byCategory = new Map<string, BlogPost[]>();
    for (const p of posts) {
      const cat = p.category ? normalize(p.category) : "other";
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
    let round = 0;
    const maxRounds = Math.max(...Array.from(byCategory.values()).map(v => v.length), 0);
    while (ordered.length < posts.length && round < maxRounds) {
      for (const cat of categoryOrder) {
        const catPosts = byCategory.get(cat);
        if (catPosts && catPosts[round] && !usedIds.has(catPosts[round].id)) {
          ordered.push(catPosts[round]);
          usedIds.add(catPosts[round].id);
        }
      }
      for (const [cat, catPosts] of byCategory) {
        if (!categoryOrder.includes(cat) && catPosts[round] && !usedIds.has(catPosts[round].id)) {
          ordered.push(catPosts[round]);
          usedIds.add(catPosts[round].id);
        }
      }
      round++;
    }
    return ordered;
  }, [posts, activeFilter, maxCards]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog Funeraria Santa Margarita",
    description: "Artículos sobre servicios funerarios, previsión y orientación familiar.",
    url: `${SITE_URL}/blog`,
    publisher: { "@type": "Organization", name: "Funeraria Santa Margarita", url: SITE_URL },
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="pt-28 pb-16 bg-primary text-primary-foreground">
        <div className="container">
          <Breadcrumbs items={[{ label: "Blog" }]} />
          <div className="text-center">
            <p className="text-gold text-xs tracking-solemn uppercase mb-4">Nuestro Blog</p>
            <h1 className="text-section font-playfair italic mb-4">Artículos y Orientación</h1>
            <p className="text-primary-foreground/60 max-w-xl mx-auto">
              Información, guía y contención para acompañarle en cada etapa.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container">
          <BlogCategoryFilter active={activeFilter} onChange={handleFilterChange} />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-lg overflow-hidden border border-border/50 animate-pulse">
                  <div className="aspect-[16/10] bg-muted" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {activeFilter ? "No hay artículos en esta categoría aún." : "Próximamente publicaremos artículos de interés."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => {
                const image = post.cover_image || getCategoryImage(post.category);
                return (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group bg-card rounded-lg overflow-hidden border border-border/50 hover:border-gold/30 transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <OptimizedImage src={image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-brand-slow" />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                        {post.category && (
                          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{post.category}</span>
                        )}
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.published_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <h2 className="font-playfair text-lg text-foreground mb-2 leading-snug group-hover:text-gold transition-brand">{post.title}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
                      <span className="inline-flex items-center gap-1 text-gold text-xs tracking-wide-brand uppercase group-hover:gap-2 transition-all duration-300">
                        Leer más <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
