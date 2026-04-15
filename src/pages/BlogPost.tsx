import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import TableOfContents, { extractHeadings } from "@/components/blog/TableOfContents";
import RelatedPosts from "@/components/blog/RelatedPosts";
import BlogCTA from "@/components/blog/BlogCTA";
import BlogFAQ from "@/components/blog/BlogFAQ";
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

/** Map category to CTA variants */
function getCTAVariants(category: string | null): Array<"contact" | "plans" | "legados" | "prevision" | "whatsapp"> {
  const cat = (category || "").toLowerCase();
  if (cat.includes("previsión") || cat.includes("prevision")) return ["prevision", "plans", "contact"];
  if (cat.includes("servicio")) return ["plans", "contact", "legados"];
  if (cat.includes("duelo") || cat.includes("contención") || cat.includes("salud") || cat.includes("apoyo")) return ["contact", "legados", "whatsapp"];
  if (cat.includes("guía") || cat.includes("guias")) return ["plans", "contact", "prevision"];
  if (cat.includes("novedad")) return ["legados", "plans", "contact"];
  return ["contact", "plans", "legados"];
}

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
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "article");
    setMeta("property", "og:url", url);
    if (post.cover_image) setMeta("property", "og:image", post.cover_image);
    if (post.published_at) setMeta("property", "article:published_time", post.published_at);
    if (post.category) setMeta("property", "article:section", post.category);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (post.cover_image) setMeta("name", "twitter:image", post.cover_image);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    return () => {
      document.title = "Funeraria Santa Margarita — Servicio Funerario Profesional 24/7";
      if (canonical) canonical.setAttribute("href", SITE_URL);
    };
  }, [post]);

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

  // Extract FAQ items from content
  const faqItems = extractFAQ(post.content);

  // Remove FAQ section from main content to render it separately
  const contentWithoutFAQ = removeFAQSection(post.content);

  // CTA variants based on category
  const ctaVariants = getCTAVariants(post.category);

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

  // BreadcrumbList schema
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      ...(post.category ? [{ "@type": "ListItem", position: 3, name: post.category, item: `${SITE_URL}/blog?cat=${post.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}` }] : []),
      { "@type": "ListItem", position: post.category ? 4 : 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

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

  // Render content with heading IDs, inline CTAs
  const renderContent = (md: string) => {
    const lines = md.split("\n");
    const elements: React.ReactNode[] = [];
    let headingIdx = 0;
    let listBuffer: React.ReactNode[] = [];
    let h2Count = 0;

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
        h2Count++;

        elements.push(<h2 key={i} id={id} className="font-playfair text-2xl text-foreground mt-10 mb-4 scroll-mt-24">{line.slice(3)}</h2>);

        // Insert contextual CTA after every 2nd h2 section
        if (h2Count > 0 && h2Count % 2 === 0 && ctaVariants.length > 0) {
          const ctaIdx = Math.floor((h2Count / 2 - 1) % ctaVariants.length);
          elements.push(<BlogCTA key={`cta-${h2Count}`} variant={ctaVariants[ctaIdx]} />);
        }
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
    const parts = text.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-foreground font-medium">{part.slice(2, -2)}</strong>;
      }
      const linkMatch = part.match(/^\[(.+?)\]\((.+?)\)$/);
      if (linkMatch) {
        const [, linkText, href] = linkMatch;
        const cleanText = linkText.replace(/\s*→\s*$/, "");
        if (href.startsWith("/")) {
          return <Link key={i} to={href} className="text-gold hover:text-gold-light underline underline-offset-2 transition-colors">{cleanText}</Link>;
        }
        return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light underline underline-offset-2 transition-colors">{cleanText}</a>;
      }
      return part;
    });
  };

  const shareUrl = `${SITE_URL}/blog/${post.slug}`;

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      {/* Hero */}
      {(() => {
        const heroImage = post.cover_image || getCategoryImage(post.category);
        const isLogo = heroImage.includes("logo-oficial");
        const logoSrc = isLogo ? "/assets/images/brand/logo-white.webp" : heroImage;
        return (
          <section className="relative w-full min-h-[480px] sm:min-h-[540px] md:min-h-[600px] overflow-hidden bg-[#080808]">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              {isLogo ? (
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 70% 50%, hsl(40 56% 41% / 0.08), transparent 70%)' }} />
              ) : (
                <>
                  <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" fetchPriority="high" style={{ filter: 'blur(2px) saturate(1.15) brightness(0.55) contrast(1.08)' }} />
                  <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-[1.15] blur-[40px] opacity-30 mix-blend-soft-light" loading="lazy" decoding="async" />
                </>
              )}
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/60 pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent z-20" />

            <div className="relative z-10 h-full container max-w-6xl flex flex-col md:flex-row items-end md:items-center gap-6 md:gap-12 pt-28 pb-12 md:pt-24 md:pb-16 min-h-[480px] sm:min-h-[540px] md:min-h-[600px]">
              <div className="flex-1 flex flex-col justify-center md:pr-8 order-2 md:order-1">
                <Breadcrumbs
                  items={[
                    { label: "Blog", href: "/blog" },
                    ...(post.category ? [{ label: post.category, href: `/blog?cat=${post.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}` }] : []),
                    { label: post.title },
                  ]}
                />
                <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl font-playfair italic leading-[1.15] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] mt-2">
                  {post.title}
                </h1>
                {post.excerpt && (
                  <p className="text-white/60 mt-4 text-base sm:text-lg max-w-xl leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{post.excerpt}</p>
                )}
                <div className="relative mt-8 mb-5">
                  <div className="absolute -top-px left-0 w-full max-w-xs h-[3px] rounded-full bg-gradient-to-r from-gold/60 via-gold/30 to-transparent blur-[2px]" />
                  <div className="w-full max-w-xs h-px bg-gradient-to-r from-gold/50 via-gold/20 to-transparent" />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/55 tracking-wide">
                  {post.category && (
                    <span className="flex items-center gap-1.5 bg-white/[0.06] backdrop-blur-md border border-white/[0.1] rounded-full px-3.5 py-1.5 text-white/65 hover:border-gold/30 hover:text-gold/80 transition-all duration-300">
                      <Tag className="w-3.5 h-3.5 text-gold/70" />
                      {post.category}
                    </span>
                  )}
                  {post.published_at && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-white/35" />
                      {new Date(post.published_at).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-white/35" />
                    {post.author_name}
                  </span>
                  <span className="text-white/25">·</span>
                  <span className="text-white/45 whitespace-nowrap">{readingTime} min de lectura</span>
                </div>
              </div>

              {isLogo && (
                <div className="flex-shrink-0 order-1 md:order-2 w-full md:w-[380px] lg:w-[420px] xl:w-[460px] relative self-center">
                  <div className="relative flex items-center justify-center py-10">
                    <div className="absolute inset-[-20%] rounded-full pointer-events-none blur-[80px]" style={{ background: 'radial-gradient(circle, hsl(40 56% 45% / 0.08), transparent 60%)' }} />
                    <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 48%, hsl(40 56% 50% / 0.14) 0%, transparent 50%)' }} />
                    <div className="absolute inset-[15%] rounded-full pointer-events-none blur-[50px]" style={{ background: 'radial-gradient(circle, hsl(40 56% 55% / 0.22), transparent 50%)' }} />
                    <img
                      src={logoSrc}
                      alt={post.title}
                      className="relative z-10 w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] md:w-[280px] md:h-[280px] lg:w-[320px] lg:h-[320px] object-contain"
                      style={{ filter: 'drop-shadow(0 0 30px rgba(197,160,89,0.30)) drop-shadow(0 0 60px rgba(197,160,89,0.15)) drop-shadow(0 0 120px rgba(197,160,89,0.08)) brightness(1.08)' }}
                    />
                    <div className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 w-[55%] h-20 overflow-hidden opacity-[0.12] pointer-events-none" aria-hidden="true">
                      <img src={logoSrc} alt="" className="w-full h-[320px] object-contain scale-y-[-1] origin-top blur-[12px]" loading="lazy" decoding="async" style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 75%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 75%)' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* Content */}
      <section className="py-16 bg-background">
        <article className="container max-w-3xl">
          <TableOfContents content={post.content} />

          <div className="prose-funeraria">
            {renderContent(contentWithoutFAQ)}
          </div>

          {/* Interactive FAQ Section */}
          <BlogFAQ items={faqItems} blogTitle={post.title} />

          {/* Final CTA */}
          <BlogCTA variant={ctaVariants[0]} />

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
      if (line.startsWith("## ")) break;
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

/** Remove FAQ section from markdown so it can be rendered separately */
function removeFAQSection(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let inFaqSection = false;

  for (const line of lines) {
    if (line.match(/^##\s*(preguntas?\s*frecuentes|faq)/i)) {
      inFaqSection = true;
      continue;
    }
    if (inFaqSection) {
      if (line.startsWith("## ")) {
        inFaqSection = false;
        result.push(line);
      }
      continue;
    }
    result.push(line);
  }
  return result.join("\n");
}

export default BlogPostPage;
