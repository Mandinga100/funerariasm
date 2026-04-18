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
import ExitIntentPopup from "@/components/ExitIntentPopup";

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
  const activeFilter = searchParams.get("cat");
  const activeTag = searchParams.get("tag");

  // Selecting a category clears any active tag so the views stay coherent.
  const handleFilterChange = (filter: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (filter) next.set("cat", filter);
    else next.delete("cat");
    next.delete("tag");
    setSearchParams(next, { replace: true });
  };

  const clearTag = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tag");
    setSearchParams(next, { replace: true });
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

  const maxCards = activeFilter || activeTag ? (isMobile ? 3 : 6) : undefined;

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");

  const filteredPosts = useMemo(() => {
    const categoryOrder = ["novedades", "guias", "servicios", "duelo", "prevision", "contencion-emocional", "salud-mental", "apoyo-familiar"];
    const sortByDateDesc = (a: BlogPost, b: BlogPost) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    };

    // Tag filter has priority over category when both are present in the URL.
    if (activeTag) {
      const result = posts.filter((p) =>
        p.tags?.some((t) => normalize(t) === activeTag)
      );
      result.sort(sortByDateDesc);
      return result.slice(0, maxCards);
    }

    if (activeFilter) {
      const result = posts.filter((p) => {
        const cat = p.category ? normalize(p.category) : "";
        return cat === activeFilter;
      });
      result.sort(sortByDateDesc);
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
      group.sort(sortByDateDesc);
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
  }, [posts, activeFilter, activeTag, maxCards]);

  // Recover the original (non-normalized) tag label for the chip UI.
  const activeTagLabel = useMemo(() => {
    if (!activeTag) return null;
    for (const p of posts) {
      const found = p.tags?.find((t) => normalize(t) === activeTag);
      if (found) return found;
    }
    return activeTag;
  }, [activeTag, posts]);

  // When the active tag returns 0 results, surface the 3 most-used tags from
  // articles that share the active category (or globally as fallback).
  // Excludes the active tag itself.
  const relatedTagSuggestions = useMemo(() => {
    if (!activeTag || filteredPosts.length > 0) return [] as { slug: string; label: string; count: number }[];
    const scopePosts = activeFilter
      ? posts.filter((p) => p.category && normalize(p.category) === activeFilter)
      : posts;
    const counts = new Map<string, { label: string; count: number }>();
    for (const p of scopePosts) {
      for (const raw of p.tags || []) {
        const slug = normalize(raw);
        if (!slug || slug === activeTag) continue;
        const existing = counts.get(slug);
        if (existing) existing.count += 1;
        else counts.set(slug, { label: raw, count: 1 });
      }
    }
    return Array.from(counts.entries())
      .map(([slug, v]) => ({ slug, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 3);
  }, [activeTag, activeFilter, filteredPosts.length, posts]);

  const applyTag = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tag", slug);
    setSearchParams(next, { replace: true });
  };

  // Preload the LCP image: hero of the first visible blog card
  useEffect(() => {
    const firstPost = filteredPosts[0];
    if (!firstPost) return;
    const heroSrc = firstPost.cover_image || getCategoryImage(firstPost.category);
    if (!heroSrc) return;

    const isHero = /\/assets\/images\/blog\/[a-z-]+-hero\.(jpe?g|webp)$/i.test(heroSrc);
    const isJpeg = /\.(jpe?g)$/i.test(heroSrc);
    const webpSrc = isJpeg ? heroSrc.replace(/\.(jpe?g)$/i, ".webp") : heroSrc;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.setAttribute("fetchpriority", "high");

    if (isHero) {
      link.setAttribute(
        "imagesrcset",
        `${webpSrc.replace(/\.webp$/, "-400w.webp")} 400w, ${webpSrc.replace(/\.webp$/, "-800w.webp")} 800w, ${webpSrc} 1024w`
      );
      link.setAttribute("imagesizes", "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw");
      link.type = "image/webp";
      link.href = webpSrc.replace(/\.webp$/, "-800w.webp");
    } else {
      link.href = heroSrc;
    }

    document.head.appendChild(link);
    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, [filteredPosts]);

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

          {activeTag && (
            <div className="flex justify-center mb-8 -mt-2">
              <button
                onClick={clearTag}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs tracking-wide-brand uppercase border border-gold/40 bg-gold/10 text-gold hover:bg-gold hover:text-accent-foreground transition-brand"
                aria-label={`Quitar filtro por etiqueta ${activeTagLabel}`}
              >
                <Tag className="w-3 h-3" />
                <span>Etiqueta: {activeTagLabel}</span>
                <span aria-hidden="true" className="text-base leading-none">×</span>
              </button>
            </div>
          )}

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
                {activeTag
                  ? `No encontramos artículos con la etiqueta "${activeTagLabel}".`
                  : activeFilter
                    ? "No hay artículos en esta categoría aún."
                    : "Próximamente publicaremos artículos de interés."}
              </p>
              {activeTag && relatedTagSuggestions.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wide-brand text-muted-foreground/80 mb-3">
                    Etiquetas relacionadas
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {relatedTagSuggestions.map(({ slug, label }) => (
                      <button
                        key={slug}
                        onClick={() => applyTag(slug)}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs tracking-wide-brand uppercase border border-gold/40 bg-gold/10 text-gold hover:bg-gold hover:text-accent-foreground transition-brand"
                        aria-label={`Filtrar por etiqueta ${label}`}
                      >
                        <Tag className="w-3 h-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => {
                const image = post.cover_image || getCategoryImage(post.category);
                return (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group bg-card rounded-lg overflow-hidden border border-border/50 hover:border-gold/30 transition-brand hover:shadow-[0_12px_40px_-12px_hsl(var(--gold)/0.15)]"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <OptimizedImage
                        src={image}
                        alt={post.title}
                        width={800}
                        height={500}
                        priority={index === 0}
                        className="w-full h-full object-cover group-hover:scale-105 transition-brand-slow"
                      />
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
      <ExitIntentPopup source="popup-salida-blog" />
    </Layout>
  );
};

export default Blog;
