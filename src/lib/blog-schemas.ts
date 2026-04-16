const SITE_URL = "https://funerariasantamargarita.cl";

const ORG_BASE = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Funeraria Santa Margarita",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/assets/images/ui/og-image.webp`,
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+56964333760",
    contactType: "customer service",
    areaServed: "CL",
    availableLanguage: ["Spanish"],
  },
  sameAs: [] as string[],
};

const FUNERAL_HOME_BASE = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "FuneralHome"],
  "@id": `${SITE_URL}/#funeralhome`,
  name: "Funeraria Santa Margarita",
  url: SITE_URL,
  telephone: "+56964333760",
  email: "funerariasantamargarita2026@gmail.com",
  image: `${SITE_URL}/assets/images/ui/og-image.webp`,
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Santiago",
    addressRegion: "Región Metropolitana",
    addressCountry: "CL",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
  ],
  areaServed: { "@type": "Country", name: "Chile" },
};

export function buildOrganizationJsonLd() {
  return { "@context": "https://schema.org", ...ORG_BASE };
}

export function buildFuneralHomeJsonLd() {
  return FUNERAL_HOME_BASE;
}

export function buildPersonJsonLd(name: string, role?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    ...(role ? { jobTitle: role } : {}),
    worksFor: { "@id": `${SITE_URL}/#organization` },
  };
}

interface ArticleSchemaInput {
  title: string;
  description?: string | null;
  slug: string;
  category?: string | null;
  tags?: string[];
  publishedAt?: string | null;
  updatedAt?: string | null;
  coverImage?: string | null;
  authorName?: string | null;
  reviewerName?: string | null;
  wordCount?: number;
  readingTimeMin?: number;
}

export function buildBlogPostingJsonLd(input: ArticleSchemaInput) {
  const url = `${SITE_URL}/blog/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description || undefined,
    datePublished: input.publishedAt || undefined,
    dateModified: input.updatedAt || input.publishedAt || undefined,
    author: input.authorName
      ? {
          "@type": "Person",
          name: input.authorName,
          worksFor: { "@id": `${SITE_URL}/#organization` },
        }
      : { "@id": `${SITE_URL}/#organization` },
    ...(input.reviewerName
      ? {
          reviewedBy: {
            "@type": "Person",
            name: input.reviewerName,
            worksFor: { "@id": `${SITE_URL}/#organization` },
          },
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "Funeraria Santa Margarita",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/assets/images/ui/og-image.webp`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(input.coverImage ? { image: input.coverImage } : {}),
    articleSection: input.category || "General",
    ...(input.tags?.length ? { keywords: input.tags.join(", ") } : {}),
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
    ...(input.readingTimeMin
      ? { timeRequired: `PT${input.readingTimeMin}M` }
      : {}),
    isAccessibleForFree: true,
    inLanguage: "es-CL",
  };
}
