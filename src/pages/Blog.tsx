import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import BlogCategoryFilter from "@/components/BlogCategoryFilter";
import { getCategoryImage } from "@/lib/blog-categories";
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
  author_name: string | null;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Blog | Funeraria Santa Margarita";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Artículos, guías y orientación sobre servicios funerarios, previsión y duelo. Funeraria Santa Margarita, Santiago, Chile.");

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

  const filteredPosts = useMemo(() => {
    if (!activeFilter) return posts;
    if (activeFilter === "novedades") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30);
      return posts.filter((p) => p.published_at && new Date(p.published_at) >= sevenDaysAgo);
    }
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
    return posts.filter((p) => {
      const cat = p.category ? normalize(p.category) : "";
      const tags = (p.tags || []).map((t) => normalize(t));
      return cat === activeFilter || tags.includes(activeFilter);
    });
  }, [posts, activeFilter]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog Funeraria Santa Margarita",
    description: "Artículos sobre servicios funerarios, previsión y orientación familiar.",
    url: "https://funerariasantamargarita.cl/blog",
    publisher: { "@type": "Organization", name: "Funeraria Santa Margarita", url: "https://funerariasantamargarita.cl" },
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="pt-28 pb-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <p className="text-gold text-xs tracking-solemn uppercase mb-4">Nuestro Blog</p>
          <h1 className="text-section font-playfair italic mb-4">Artículos y Orientación</h1>
          <p className="text-primary-foreground/60 max-w-xl mx-auto">
            Información, guía y contención para acompañarle en cada etapa.
          </p>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container">
          <BlogCategoryFilter active={activeFilter} onChange={setActiveFilter} />

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
                      <img src={image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-brand-slow" loading="lazy" />
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
