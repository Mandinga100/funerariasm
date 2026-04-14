import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import TableOfContents, { extractHeadings } from "@/components/blog/TableOfContents";
import RelatedPosts from "@/components/blog/RelatedPosts";
import { getCategoryImage } from "@/lib/blog-categories";
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
    const lines = md.split("\n");
    const elements: React.ReactNode[] = [];
    let headingIdx = 0;
    let listBuffer: React.ReactNode[] = [];

    const flushList = () => {
      if (listBuffer.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-4 ml-6 space-y-2 list-none">
            {listBuffer}
          </ul>
        );
        listBuffer = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("### ")) {
        flushList();
        const id = headings[headingIdx]?.id || "";
        headingIdx++;
        elements.push(<h3 key={i} id={id} className="font-playfair text-xl text-foreground mt-8 mb-3 scroll-mt-24">{line.slice(4)}</h3>);
      } else if (line.startsWith("## ")) {
        flushList();
        const id = headings[headingIdx]?.id || "";
        headingIdx++;
        elements.push(<h2 key={i} id={id} className="font-playfair text-2xl text-foreground mt-10 mb-4 scroll-mt-24">{line.slice(3)}</h2>);
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        const content = line.slice(2);
        listBuffer.push(
          <li key={i} className="text-muted-foreground leading-relaxed flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60 mt-2 shrink-0" />
            <span>{renderInline(content)}</span>
          </li>
        );
      } else if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, "");
        const num = line.match(/^(\d+)\./)?.[1] || "1";
        listBuffer.push(
          <li key={i} className="text-muted-foreground leading-relaxed flex items-start gap-3">
            <span className="w-6 h-6 rounded-full border border-gold/30 bg-gold/5 flex items-center justify-center text-[11px] font-semibold text-gold shrink-0 mt-0.5">{num}</span>
            <span>{renderInline(content)}</span>
          </li>
        );
      } else {
        flushList();
        if (line.trim() === "") {
          elements.push(<br key={i} />);
        } else {
          elements.push(<p key={i} className="text-muted-foreground leading-relaxed mb-4">{renderInline(line)}</p>);
        }
      }
    }
    flushList();
    return elements;
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

      {/* Hero — Senior UI/UX split layout */}
      {(() => {
        const heroImage = post.cover_image || getCategoryImage(post.category);
        const isLogo = heroImage.includes("logo-oficial");
        return (
          <section className="relative w-full min-h-[420px] sm:min-h-[480px] md:min-h-[540px] overflow-hidden bg-[#080808]">
            {/* ── Layer 1: Mirrored blurred background (large, fills entire hero) ── */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <img
                src={heroImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-[28px] opacity-40"
              />
              {/* Mirrored reflection — flipped & extra blur */}
              <img
                src={heroImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-y-[-1] scale-x-110 blur-[40px] opacity-20 mix-blend-soft-light"
              />
            </div>

            {/* ── Layer 2: Multi-stop gradient overlays for depth ── */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
            {/* Radial vignette for cinematic depth */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 100% at 75% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />

            {/* ── Layer 3: Gold accent lines ── */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent z-20" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent z-20" />

            {/* ── Layer 4: Content grid — text left, sharp image right ── */}
            <div className="relative z-10 h-full container max-w-6xl flex flex-col md:flex-row items-end md:items-center gap-6 md:gap-10 py-10 md:py-0 min-h-[420px] sm:min-h-[480px] md:min-h-[540px]">
              
              {/* Left: Text content */}
              <div className="flex-1 flex flex-col justify-center md:pr-8 order-2 md:order-1">
                <Breadcrumbs
                  items={[
                    { label: "Blog", href: "/blog" },
                    ...(post.category ? [{ label: post.category, href: `/blog?cat=${post.category}` }] : []),
                    { label: post.title },
                  ]}
                />
                <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl font-playfair italic leading-[1.15] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] mt-2">
                  {post.title}
                </h1>
                {post.excerpt && (
                  <p className="text-white/55 mt-4 text-base sm:text-lg max-w-xl leading-relaxed drop-shadow-sm">{post.excerpt}</p>
                )}
                <div className="w-full max-w-xs h-px bg-gradient-to-r from-gold/40 via-gold/20 to-transparent mt-6 mb-3" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45 tracking-wide">
                  {post.category && (
                    <span className="flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">
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
                  <span className="text-white/25">·</span>
                  <span>{readingTime} min de lectura</span>
                </div>
              </div>

              {/* Right: Sharp image with frame & reflection */}
              <div className="flex-shrink-0 order-1 md:order-2 w-full md:w-[380px] lg:w-[440px] relative self-center">
                {/* Glow behind image */}
                <div className="absolute -inset-4 rounded-2xl opacity-30 blur-2xl pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(40 56% 41% / 0.4), transparent 70%)' }} />
                {/* Main sharp image */}
                <div className="relative rounded-xl overflow-hidden shadow-[0_8px_40px_-8px_rgba(0,0,0,0.7)] border border-white/10">
                  <img
                    src={heroImage}
                    alt={post.title}
                    className="w-full h-[200px] sm:h-[240px] md:h-[300px] lg:h-[340px] object-cover"
                    style={{ imageRendering: 'auto', filter: 'contrast(1.02) saturate(1.05)' }}
                  />
                  {/* Subtle inner border glow */}
                  <div className="absolute inset-0 rounded-xl border border-white/5 pointer-events-none" />
                  {/* Bottom gold accent on image */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                </div>
                {/* Mirror reflection below image */}
                <div className="relative h-16 mt-px overflow-hidden rounded-b-xl opacity-25 pointer-events-none" aria-hidden="true">
                  <img
                    src={heroImage}
                    alt=""
                    className="w-full h-[340px] object-cover scale-y-[-1] origin-top blur-[6px]"
                    style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }}
                  />
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Content */}
      <section className="py-16 bg-background">
        <article className="container max-w-3xl">
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
