import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Calendar, Tag, ArrowLeft, User } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string | null;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  author_name: string | null;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchPost = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();
      setPost(data as BlogPost | null);
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    document.title = post.meta_title || post.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", post.meta_description || post.excerpt || "");
  }, [post]);

  if (loading) {
    return (
      <Layout>
        <section className="pt-28 pb-16 bg-primary text-primary-foreground">
          <div className="container text-center">
            <div className="h-8 bg-primary-foreground/10 rounded w-1/2 mx-auto animate-pulse" />
          </div>
        </section>
        <section className="py-16 bg-background">
          <div className="container max-w-3xl space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${90 - i * 10}%` }} />
            ))}
          </div>
        </section>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <section className="pt-28 pb-16 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h1 className="text-section font-playfair italic">Artículo no encontrado</h1>
          </div>
        </section>
        <section className="py-16 bg-background text-center">
          <Link to="/blog" className="text-gold hover:text-gold-light text-sm tracking-wide-brand uppercase transition-brand">
            ← Volver al blog
          </Link>
        </section>
      </Layout>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description || post.excerpt,
    datePublished: post.published_at,
    author: {
      "@type": "Organization",
      name: post.author_name || "Funeraria Santa Margarita",
    },
    publisher: {
      "@type": "Organization",
      name: "Funeraria Santa Margarita",
      url: "https://funerariasantamargarita.cl",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://funerariasantamargarita.cl/blog/${post.slug}`,
    },
    ...(post.cover_image && { image: post.cover_image }),
  };

  // Simple markdown to HTML (basic: headings, bold, lists, paragraphs)
  const renderContent = (md: string) => {
    return md
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="font-playfair text-xl text-foreground mt-8 mb-3">{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="font-playfair text-2xl text-foreground mt-10 mb-4">{line.slice(3)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          const text = line.slice(2);
          return (
            <li key={i} className="text-muted-foreground leading-relaxed ml-6 list-disc">
              {renderInline(text)}
            </li>
          );
        }
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} className="text-muted-foreground leading-relaxed mb-4">{renderInline(line)}</p>;
      });
  };

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-foreground font-medium">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <section className="pt-28 pb-16 bg-primary text-primary-foreground">
        <div className="container max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-2 text-gold/60 hover:text-gold text-xs tracking-wide-brand uppercase mb-8 transition-brand">
            <ArrowLeft className="w-3 h-3" /> Volver al blog
          </Link>
          <div className="flex items-center gap-3 mb-4 text-xs text-primary-foreground/50">
            {post.category && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-gold" />
                {post.category}
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(post.published_at).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {post.author_name}
            </span>
          </div>
          <h1 className="text-section font-playfair italic leading-tight">{post.title}</h1>
          {post.excerpt && (
            <p className="text-primary-foreground/60 mt-4 text-lg">{post.excerpt}</p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-background">
        <article className="container max-w-3xl">
          {post.cover_image && (
            <div className="rounded-lg overflow-hidden mb-10 aspect-[16/9]">
              <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="prose-funeraria">
            {renderContent(post.content)}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border/50 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs bg-card border border-border/50 text-muted-foreground px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 p-8 bg-card rounded-lg border border-border/50 text-center">
            <p className="font-playfair text-lg text-foreground mb-2">¿Necesita orientación?</p>
            <p className="text-sm text-muted-foreground mb-4">Nuestro equipo está disponible 24/7 para acompañarle.</p>
            <a
              href="tel:+56964333760"
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-accent-foreground px-6 py-3 rounded-full text-sm tracking-wide-brand uppercase transition-brand"
            >
              Contactar ahora
            </a>
          </div>
        </article>
      </section>
    </Layout>
  );
};

export default BlogPost;
