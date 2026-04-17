/**
 * Dynamic meta tag helpers for Open Graph, Twitter Cards and canonical URLs.
 *
 * Used by detail pages (blog posts, memorials, obituaries) to ensure rich
 * previews when shared on WhatsApp, Facebook, Twitter/X and other social platforms.
 */

const SITE_URL = "https://funerariasantamargarita.cl";
const SITE_NAME = "Funeraria Santa Margarita";
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/images/ui/og-image.webp`;
const DEFAULT_LOCALE = "es_CL";

export type OgType = "article" | "profile" | "website";

export interface SeoMetaInput {
  title: string;
  description: string;
  url: string;
  image?: string | null;
  type?: OgType;
  publishedAt?: string | null;
  updatedAt?: string | null;
  section?: string | null;
}

/** Ensure absolute URL for image (required by some crawlers like WhatsApp). */
function toAbsoluteUrl(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `${SITE_URL}${src}`;
  return `${SITE_URL}/${src}`;
}

/** Truncate description to 160 chars (SEO best practice). */
function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);
}

/**
 * Apply a full set of SEO + Open Graph + Twitter Card meta tags.
 * Falls back to the default site OG image when none is provided so previews
 * never render blank on WhatsApp / iMessage.
 */
export function applySeoMeta(input: SeoMetaInput): void {
  const title = truncate(input.title, 70);
  const description = truncate(input.description, 160);
  const image = toAbsoluteUrl(input.image || DEFAULT_OG_IMAGE);
  const type: OgType = input.type ?? "article";

  document.title = `${title} | ${SITE_NAME}`;

  // Standard
  setMeta("name", "description", description);
  setMeta("name", "robots", "index, follow, max-image-preview:large");

  // Open Graph
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:type", type);
  setMeta("property", "og:url", input.url);
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("property", "og:locale", DEFAULT_LOCALE);
  setMeta("property", "og:image", image);
  setMeta("property", "og:image:alt", title);
  setMeta("property", "og:image:width", "1200");
  setMeta("property", "og:image:height", "630");

  if (input.publishedAt) setMeta("property", "article:published_time", input.publishedAt);
  if (input.updatedAt) setMeta("property", "article:modified_time", input.updatedAt);
  if (input.section) setMeta("property", "article:section", input.section);

  // Twitter Card
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", image);
  setMeta("name", "twitter:image:alt", title);

  // WhatsApp also reads this fallback
  setMeta("name", "thumbnail", image);

  setCanonical(input.url);
}
