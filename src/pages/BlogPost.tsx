import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import TableOfContents, { extractHeadings } from "@/components/blog/TableOfContents";
import RelatedPosts from "@/components/blog/RelatedPosts";
import BlogCTA from "@/components/blog/BlogCTA";
import BlogFAQ from "@/components/blog/BlogFAQ";
import QuickAnswer from "@/components/blog/QuickAnswer";
import NextSteps, { type NextStep } from "@/components/blog/NextSteps";
import AuthorMeta from "@/components/blog/AuthorMeta";
import FloatingCTA from "@/components/blog/FloatingCTA";
import ArticleTitle from "@/components/blog/ArticleTitle";
import ShareButtons from "@/components/blog/ShareButtons";
import AtendemosTuComuna from "@/components/blog/AtendemosTuComuna";
import { getCategoryImage } from "@/lib/blog-categories";
import { getViralTags } from "@/lib/blog-viral-tags";
import {
  buildBlogPostingJsonLd,
  buildFuneralHomeJsonLd,
  buildOrganizationJsonLd,
  buildPersonJsonLd,
} from "@/lib/blog-schemas";
import { applySeoMeta } from "@/lib/seo-meta";
import { Calendar, Tag, User } from "lucide-react";

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
  updated_at?: string | null;
  author_name: string | null;
}

const SITE_URL = "https://funerariasantamargarita.cl";

/** Editorial defaults — used when DB does not provide explicit values. */
const DEFAULT_AUTHOR = "Equipo Editorial Funeraria Santa Margarita";
const DEFAULT_REVIEWER = "Equipo Profesional Funeraria Santa Margarita";

/** Map category to CTA variants */
function getCTAVariants(
  category: string | null
): Array<"contact" | "plans" | "legados" | "prevision" | "whatsapp"> {
  const cat = (category || "").toLowerCase();
  if (cat.includes("previsión") || cat.includes("prevision"))
    return ["prevision", "plans", "contact"];
  if (cat.includes("servicio")) return ["plans", "contact", "legados"];
  if (
    cat.includes("duelo") ||
    cat.includes("contención") ||
    cat.includes("salud") ||
    cat.includes("apoyo")
  )
    return ["contact", "legados", "whatsapp"];
  if (cat.includes("guía") || cat.includes("guias"))
    return ["plans", "contact", "prevision"];
  if (cat.includes("novedad")) return ["legados", "plans", "contact"];
  return ["contact", "plans", "legados"];
}

/** Default contextual "next steps" by category — concrete, actionable, no fabricated data. */
function getDefaultNextSteps(category: string | null): NextStep[] {
  const cat = (category || "").toLowerCase();
  const base: NextStep[] = [
    {
      title: "Hable con un asesor funerario 24/7",
      description:
        "Atendemos consultas urgentes y orientación inicial todos los días del año, incluyendo madrugadas y festivos.",
      href: "tel:+56964333760",
      cta: "Llamar al +56 9 6433 3760",
      external: true,
    },
    {
      title: "Compare planes y coberturas",
      description:
        "Revise nuestras opciones funerarias con cobertura completa, gestión de trámites incluida y precios transparentes.",
      href: "/planes",
      cta: "Ver planes y precios",
    },
    {
      title: "Solicite una cotización personalizada",
      description:
        "Cuéntenos su situación y le respondemos con una propuesta clara, sin compromiso, en menos de 24 horas.",
      href: "/contacto",
      cta: "Ir al formulario de contacto",
    },
  ];

  if (cat.includes("duelo") || cat.includes("salud") || cat.includes("contención") || cat.includes("apoyo")) {
    return [
      {
        title: "Permítase pedir acompañamiento",
        description:
          "Hablar con alguien de confianza, un profesional o un grupo de apoyo es un primer paso válido y necesario.",
      },
      {
        title: "Cree un Legado Eterno para honrar la memoria",
        description:
          "Un espacio digital permanente donde familiares y amigos pueden dejar mensajes, fotografías y homenajes.",
        href: "/legados-eternos",
        cta: "Conocer Legados Eternos",
      },
      base[0],
    ];
  }

  if (cat.includes("previsión") || cat.includes("prevision")) {
    return [
      {
        title: "Conozca las opciones de previsión funeraria",
        description:
          "La planificación anticipada permite congelar precios actuales y liberar a su familia de gestiones futuras.",
        href: "/planes",
        cta: "Ver opciones de previsión",
      },
      base[2],
      base[0],
    ];
  }

  return base;
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

  useEffect(() => {
    if (!post) return;
    applySeoMeta({
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || "",
      url: `${SITE_URL}/blog/${post.slug}`,
      image: post.cover_image || getCategoryImage(post.category),
      type: "article",
      publishedAt: post.published_at,
      updatedAt: post.updated_at,
      section: post.category,
    });
  }, [post]);

  // Preload the LCP hero image (responsive srcset for category heroes; logo handled separately)
  useEffect(() => {
    if (!post) return;
    const heroSrc = post.cover_image || getCategoryImage(post.category);
    if (!heroSrc) return;

    const isLogo = heroSrc.includes("logo-oficial");
    const isHero = /\/assets\/images\/blog\/[a-z-]+-hero\.(jpe?g|webp)$/i.test(heroSrc);
    const isJpeg = /\.(jpe?g)$/i.test(heroSrc);
    const webpSrc = isJpeg ? heroSrc.replace(/\.(jpe?g)$/i, ".webp") : heroSrc;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.setAttribute("fetchpriority", "high");

    if (isLogo) {
      // Logo variant uses the white version on a dark hero
      link.href = "/assets/images/brand/logo-white.webp";
      link.type = "image/webp";
    } else if (isHero) {
      link.setAttribute(
        "imagesrcset",
        `${webpSrc.replace(/\.webp$/, "-400w.webp")} 400w, ${webpSrc.replace(/\.webp$/, "-800w.webp")} 800w, ${webpSrc} 1024w`
      );
      link.setAttribute("imagesizes", "100vw");
      link.type = "image/webp";
      link.href = webpSrc.replace(/\.webp$/, "-800w.webp");
    } else {
      link.href = heroSrc;
    }

    document.head.appendChild(link);
    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
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
        {/* Hero skeleton — matches loaded hero height to prevent CLS when content arrives */}
        <section className="relative w-full min-h-[480px] sm:min-h-[540px] md:min-h-[600px] pt-28 pb-16 bg-primary text-primary-foreground overflow-hidden">
          <div className="container max-w-3xl">
            <div className="h-4 bg-primary-foreground/10 rounded w-1/3 mb-6 animate-pulse" />
            <div className="h-8 bg-primary-foreground/10 rounded w-2/3 mb-4 animate-pulse" />
            <div className="h-8 bg-primary-foreground/10 rounded w-1/2 animate-pulse" />
          </div>
        </section>
        {/* Article body skeleton — reserves enough vertical space so the footer doesn't jump up */}
        <section className="py-16 bg-background min-h-[1200px]">
          <div className="container max-w-3xl space-y-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-muted rounded animate-pulse"
                style={{ width: `${90 - (i % 4) * 10}%` }}
              />
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

  // Extract a quick "short answer" from the content — first non-heading paragraph after the first H2 (or the excerpt fallback).
  const quickAnswer = extractQuickAnswer(post.content) || post.excerpt;

  // Extract the leading H1 title from markdown so we can render it with a premium component
  const leadingTitle = extractLeadingH1(post.content);

  // Remove FAQ section AND the leading H1 from main content to render them separately
  const contentWithoutFAQ = removeLeadingH1(removeFAQSection(post.content));

  // CTA variants based on category
  const ctaVariants = getCTAVariants(post.category);

  // Editorial metadata
  const authorName = post.author_name || DEFAULT_AUTHOR;
  const reviewerName = DEFAULT_REVIEWER;
  const wordCount = post.content.split(/\s+/).length;

  // JSON-LD: BlogPosting + Breadcrumb + FAQPage + Organization + FuneralHome + Person (author)
  const articleJsonLd = buildBlogPostingJsonLd({
    title: post.title,
    description: post.meta_description || post.excerpt,
    slug: post.slug,
    category: post.category,
    tags: post.tags,
    publishedAt: post.published_at,
    updatedAt: post.updated_at,
    coverImage: post.cover_image,
    authorName,
    reviewerName,
    wordCount,
    readingTimeMin: readingTime,
  });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      ...(post.category
        ? [{
            "@type": "ListItem",
            position: 3,
            name: post.category,
            item: `${SITE_URL}/blog?cat=${post.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`,
          }]
        : []),
      { "@type": "ListItem", position: post.category ? 4 : 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  const faqJsonLd =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  const organizationJsonLd = buildOrganizationJsonLd();
  const funeralHomeJsonLd = buildFuneralHomeJsonLd();
  const personJsonLd = post.author_name ? buildPersonJsonLd(post.author_name, "Editor") : null;

  const headings = extractHeadings(post.content);
  const nextSteps = getDefaultNextSteps(post.category);

  // Render content with heading IDs (no inline CTAs — only the final CTA before FAQ remains).
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
        elements.push(
          <h3 key={i} id={id} className="font-playfair text-xl text-foreground mt-8 mb-3 scroll-mt-24">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith("## ")) {
        flushList();
        const id = headings[headingIdx]?.id || "";
        headingIdx++;

        elements.push(
          <h2 key={i} id={id} className="font-playfair text-2xl text-foreground mt-10 mb-4 scroll-mt-24">
            {line.slice(3)}
          </h2>
        );
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
          elements.push(
            <p key={i} className="text-muted-foreground leading-relaxed mb-4">
              {renderInline(line)}
            </p>
          );
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
        const isExternal = /^https?:\/\//.test(href);
        if (href.startsWith("/")) {
          return (
            <Link key={i} to={href} className="text-gold hover:text-gold-light underline underline-offset-2 transition-colors">
              {cleanText}
            </Link>
          );
        }
        return (
          <a
            key={i}
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="text-gold hover:text-gold-light underline underline-offset-2 transition-colors"
          >
            {cleanText}
          </a>
        );
      }
      return part;
    });
  };

  const shareUrl = `${SITE_URL}/blog/${post.slug}`;

  return (
    <Layout>
      {/* Skip link for keyboard users */}
      <a
        href="#articulo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:text-sm"
      >
        Saltar al contenido principal
      </a>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(funeralHomeJsonLd) }} />
      {personJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      )}

      {/* Hero — semantic <header> */}
      {(() => {
        const heroImage = post.cover_image || getCategoryImage(post.category);
        const isLogo = heroImage.includes("logo-oficial");
        const logoSrc = isLogo ? "/assets/images/brand/logo-white.webp" : heroImage;
        return (
          <header className="relative w-full min-h-[480px] sm:min-h-[540px] md:min-h-[600px] overflow-hidden bg-[#080808]">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              {isLogo ? (
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 70% 50%, hsl(40 56% 41% / 0.08), transparent 70%)' }} />
              ) : (
                <>
                  <picture>
                    <source
                      type="image/webp"
                      srcSet={(() => {
                        const isHero = /\/assets\/images\/blog\/[a-z-]+-hero\.(jpe?g|webp)$/i.test(heroImage);
                        const webp = heroImage.replace(/\.(jpe?g)$/i, ".webp");
                        return isHero
                          ? `${webp.replace(/\.webp$/, "-400w.webp")} 400w, ${webp.replace(/\.webp$/, "-800w.webp")} 800w, ${webp} 1024w`
                          : webp;
                      })()}
                      sizes="100vw"
                    />
                    <img
                      src={heroImage}
                      alt=""
                      width={1024}
                      height={1024}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      style={{ filter: 'blur(2px) saturate(1.15) brightness(0.55) contrast(1.08)' }}
                    />
                  </picture>
                  <img
                    src={heroImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover scale-[1.15] blur-[40px] opacity-30 mix-blend-soft-light"
                    loading="lazy"
                    decoding="async"
                  />
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
                    ...(post.category
                      ? [{
                          label: post.category,
                          href: `/blog?cat=${post.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`,
                        }]
                      : []),
                    { label: post.title },
                  ]}
                />
                <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl font-playfair italic leading-[1.15] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] mt-2">
                  {post.title}
                </h1>
                {post.excerpt && (
                  <p className="text-white/60 mt-4 text-base sm:text-lg max-w-xl leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                    {post.excerpt}
                  </p>
                )}
                <div className="relative mt-8 mb-5">
                  <div className="absolute -top-px left-0 w-full max-w-xs h-[3px] rounded-full bg-gradient-to-r from-gold/60 via-gold/30 to-transparent blur-[2px]" />
                  <div className="w-full max-w-xs h-px bg-gradient-to-r from-gold/50 via-gold/20 to-transparent" />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/55 tracking-wide">
                  {post.category && (
                    <span className="flex items-center gap-1.5 bg-white/[0.06] backdrop-blur-md border border-white/[0.1] rounded-full px-3.5 py-1.5 text-white/65 hover:border-gold/30 hover:text-gold/80 transition-all duration-300">
                      <Tag className="w-3.5 h-3.5 text-gold/70" aria-hidden="true" />
                      {post.category}
                    </span>
                  )}
                  {post.published_at && (
                    <time
                      dateTime={post.published_at}
                      className="flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5 text-white/35" aria-hidden="true" />
                      {new Date(post.published_at).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  )}
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-white/35" aria-hidden="true" />
                    {authorName}
                  </span>
                  <span className="text-white/25" aria-hidden="true">·</span>
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
                      alt={`Imagen destacada: ${post.title}`}
                      className="relative z-10 w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] md:w-[280px] md:h-[280px] lg:w-[320px] lg:h-[320px] object-contain"
                      style={{ filter: 'drop-shadow(0 0 30px rgba(197,160,89,0.30)) drop-shadow(0 0 60px rgba(197,160,89,0.15)) drop-shadow(0 0 120px rgba(197,160,89,0.08)) brightness(1.08)' }}
                    />
                    <div className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 w-[55%] h-20 overflow-hidden opacity-[0.12] pointer-events-none" aria-hidden="true">
                      <img
                        src={logoSrc}
                        alt=""
                        className="w-full h-[320px] object-contain scale-y-[-1] origin-top blur-[12px]"
                        loading="lazy"
                        decoding="async"
                        style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 75%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 75%)' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </header>
        );
      })()}

      {/* Main content — semantic <main> with sticky TOC sidebar on desktop */}
      <main id="articulo-principal" className="py-16 bg-background">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
            {/* Article column */}
            <article
              itemScope
              itemType="https://schema.org/BlogPosting"
              className="min-w-0 max-w-3xl"
            >
              <meta itemProp="headline" content={post.title} />
              {post.published_at && <meta itemProp="datePublished" content={post.published_at} />}
              {post.updated_at && <meta itemProp="dateModified" content={post.updated_at} />}

              {/* Mobile TOC (compact, collapsible by default) */}
              <div className="lg:hidden">
                <TableOfContents content={post.content} />
              </div>

              {/* Author / reviewer / dates block (E-E-A-T) */}
              <AuthorMeta
                author={authorName}
                reviewer={reviewerName}
                publishedAt={post.published_at}
                updatedAt={post.updated_at}
                readingTime={readingTime}
              />

              {/* Quick answer (AEO/LLMO extractable) */}
              {quickAnswer && (
                <QuickAnswer>
                  {quickAnswer}
                </QuickAnswer>
              )}

              {/* Next steps — concrete actions */}
              <NextSteps steps={nextSteps} />

              {/* Premium article opening title (replaces raw `# Title` markdown) */}
              {leadingTitle && <ArticleTitle title={leadingTitle} />}

              {/* Article body */}
              <div className="prose-funeraria" itemProp="articleBody">
                {renderContent(contentWithoutFAQ)}
              </div>

              {/* Interactive FAQ Section */}
              <BlogFAQ items={faqItems} blogTitle={post.title} />

              {/* Final CTA — single, contextual, after FAQ */}
              <BlogCTA variant={ctaVariants[0]} />

              {/* Tags — unified styling, SEO/AEO/GEO/LLMO optimized with semantic list + rel="tag" + microdata */}
              {(() => {
                const allTags = getViralTags(post.category, post.tags || []);
                if (allTags.length === 0) return null;
                return (
                  <section
                    aria-label="Etiquetas del artículo"
                    className="mt-12 pt-8 border-t border-border/50"
                  >
                    <meta itemProp="keywords" content={allTags.join(", ")} />
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <h2 className="sr-only">Temas relacionados — Sector funerario en Chile</h2>
                      <ul className="flex flex-wrap items-center gap-2 list-none p-0 m-0">
                        {allTags.map((tag, idx) => {
                          const slug = tag
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, "");
                          return (
                            <li key={`${tag}-${idx}`}>
                              <a
                                href={`/blog?tag=${slug}`}
                                rel="tag"
                                title={`Ver más artículos sobre ${tag} — Funeraria Santa Margarita`}
                                aria-label={`Etiqueta: ${tag}`}
                                className="inline-block text-xs px-3 py-1 rounded-full border border-gold/40 bg-gold/10 text-gold font-medium transition-colors duration-300 hover:bg-gold hover:text-accent-foreground hover:border-gold hover:shadow-[0_6px_18px_-6px_hsl(var(--gold)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                              >
                                {tag}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </section>
                );
              })()}

              {/* Share — premium social buttons with brand colors */}
              <ShareButtons url={shareUrl} title={post.title} />

              {/* Related Posts */}
              <RelatedPosts currentId={post.id} category={post.category} tags={post.tags || []} />
            </article>

            {/* Sticky desktop sidebar */}
            <aside
              aria-label="Navegación del artículo"
              className="hidden lg:block"
            >
              <TableOfContents content={post.content} sticky />
            </aside>
          </div>
        </div>
      </main>

      {/* Floating contextual CTA — discreet, dismissible */}
      <FloatingCTA />
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

/** Extract a short answer — first non-empty paragraph after the first H2. Never truncates with "…". */
function extractQuickAnswer(content: string): string | null {
  const lines = content.split("\n");
  let pastFirstH2 = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!pastFirstH2) {
      if (line.startsWith("## ")) pastFirstH2 = true;
      continue;
    }
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith("-") || line.startsWith("*") || /^\d+\.\s/.test(line)) {
      continue;
    }
    // Strip markdown emphasis/links
    let clean = line
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      // Strip leading "Respuesta corta:" prefix if present
      .replace(/^respuesta\s+corta\s*[:.]\s*/i, "")
      .trim();
    if (clean.length < 40) continue;

    // If the paragraph is too long, cut at the last full sentence within ~320 chars
    // so it remains complete and concise — NEVER append "…".
    const MAX = 320;
    if (clean.length > MAX) {
      const slice = clean.slice(0, MAX);
      const lastPeriod = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("? "),
        slice.lastIndexOf("! ")
      );
      clean = lastPeriod > 80 ? slice.slice(0, lastPeriod + 1).trim() : slice.trim();
      // Ensure it ends with sentence punctuation (no ellipsis)
      if (!/[.!?]$/.test(clean)) clean += ".";
    }
    return clean;
  }
  return null;
}

/** Extract the leading H1 title (`# Title`) from markdown content. */
function extractLeadingH1(content: string): string | null {
  const lines = content.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      return line.slice(2).trim();
    }
    // If we hit any other content first, there's no leading H1
    return null;
  }
  return null;
}

/** Remove the leading H1 line from markdown so it doesn't render twice. */
function removeLeadingH1(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  let removed = false;
  for (const line of lines) {
    if (!removed && line.trim().startsWith("# ") && !line.trim().startsWith("## ")) {
      removed = true;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

export default BlogPostPage;
