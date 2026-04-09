import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import TableOfContents, { extractHeadings } from "@/components/blog/TableOfContents";
import RelatedPosts from "@/components/blog/RelatedPosts";
import { Calendar, Tag, User, Share2 } from "lucide-react";

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

const SITE_URL = "https://funerariasantamargarita.cl";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

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

  // Set meta tags dynamically
  useEffect(() => {
    if (!post) return;
    const title = post.meta_title || post.title;
    const description = post.meta_description || post.excerpt || "";
    const url = `${SITE_URL}/blog/${post.slug}`;

    document.title = `${title} | Funeraria Santa Margarita`;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    // Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "article");
    setMeta("property", "og:url", url);
    if (post.cover_image) setMeta("property", "og:image", post.cover_image);
    if (post.published_at) setMeta("property", "article:published_time", post.published_at);
    if (post.category) setMeta("property", "article:section", post.category);
    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (post.cover_image) setMeta("name", "twitter:image", post.cover_image);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    return () => {
      // Restore defaults on unmount
      document.title = "Funeraria Santa Margarita — Servicio Funerario Profesional 24/7";
      if (canonical) canonical.setAttribute("href", SITE_URL);
    };
  }, [post]);

  // Estimate reading time
  const readingTime = useMemo(() => {
    if (!post) return 0;
    const words = post.content.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [post]);

  if (loading) {
    return (
      <Layout>
        <section className="pt-28 pb-16 bg-primary text-primary-foreground">
          <div className="container max-w-3xl">
            <div className="h-4 bg-primary-foreground/10 rounded w-1/3 mb-6 animate-pulse" />
            <div className="h-8 bg-primary-foreground/10 rounded w-2/3 animate-pulse" />
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

  // Enhanced Article schema
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description || post.excerpt,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      "@type": "Organization",
      name: post.author_name || "Funeraria Santa Margarita",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Funeraria Santa Margarita",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/images/ui/og-image.webp` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
    ...(post.cover_image && { image: post.cover_image }),
    articleSection: post.category || "General",
    keywords: post.tags?.join(", "),
    wordCount: post.content.split(/\s+/).length,
  };

  // Extract FAQ from content (## Preguntas Frecuentes pattern)
  const faqItems = extractFAQ(post.content);
  const faqJsonLd = faqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  } : null;

  const headings = extractHeadings(post.content);

  // Render content with heading IDs for TOC anchoring
  const renderContent = (md: string) => {
    let headingIdx = 0;
    return md.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        const id = headings[headingIdx]?.id || "";
        headingIdx++;
        return <h3 key={i} id={id} className="font-playfair text-xl text-foreground mt-8 mb-3 scroll-mt-24">{line.slice(4)}</h3>;
      }
      if (line.startsWith("## ")) {
        const id = headings[headingIdx]?.id || "";
        headingIdx++;
        return <h2 key={i} id={id} className="font-playfair text-2xl text-foreground mt-10 mb-4 scroll-mt-24">{line.slice(3)}</h2>;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={i} className="text-muted-foreground leading-relaxed ml-6 list-disc">
            {renderInline(line.slice(2))}
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

  const shareUrl = `${SITE_URL}/blog/${post.slug}`;

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      {/* Header */}
      <section className="pt-28 pb-16 bg-primary text-primary-foreground">
        <div className="container max-w-3xl">
          <Breadcrumbs
            items={[
              { label: "Blog", href: "/blog" },
              ...(post.category ? [{ label: post.category, href: `/blog?cat=${post.category}` }] : []),
              { label: post.title },
            ]}
          />

          <h1 className="text-section font-playfair italic leading-tight">{post.title}</h1>
          {post.excerpt && (
            <p className="text-primary-foreground/60 mt-4 text-lg">{post.excerpt}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-5 text-xs text-primary-foreground/50">
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
            <span className="text-primary-foreground/30">·</span>
            <span>{readingTime} min de lectura</span>
          </div>
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

          <TableOfContents content={post.content} />

          <div className="prose-funeraria">
            {renderContent(post.content)}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border/50 flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs bg-card border border-border/50 text-muted-foreground px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Share */}
          <div className="mt-8 flex items-center gap-3">
            <Share2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Compartir:</span>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-gold transition-colors">Facebook</a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-gold transition-colors">X</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(post.title + " " + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-gold transition-colors">WhatsApp</a>
          </div>

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

          {/* Related Posts */}
          <RelatedPosts currentId={post.id} category={post.category} tags={post.tags || []} />
        </article>
      </section>
    </Layout>
  );
};

/** Extract Q&A pairs from markdown content */
function extractFAQ(content: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  const lines = content.split("\n");
  let inFaqSection = false;
  let currentQ = "";
  let currentA = "";

  for (const line of lines) {
    if (line.match(/^##\s*(preguntas?\s*frecuentes|faq)/i)) {
      inFaqSection = true;
      continue;
    }
    if (inFaqSection) {
      if (line.startsWith("## ")) break; // next h2 ends FAQ section
      if (line.startsWith("### ")) {
        if (currentQ && currentA.trim()) {
          faqs.push({ question: currentQ, answer: currentA.trim() });
        }
        currentQ = line.slice(4).replace(/\*\*/g, "").trim();
        currentA = "";
      } else if (currentQ) {
        currentA += line + " ";
      }
    }
  }
  if (currentQ && currentA.trim()) {
    faqs.push({ question: currentQ, answer: currentA.trim() });
  }
  return faqs;
}

export default BlogPostPage;
