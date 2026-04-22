const SITE_URL = "https://funerariasantamargarita.cl";
const SITE_NAME = "Funeraria Santa Margarita";
const LOGO_URL = `${SITE_URL}/assets/images/ui/logo.webp`;

function abs(path: string | null | undefined, fallback?: string): string | undefined {
  if (!path) return fallback;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

const PUBLISHER = {
  "@type": "FuneralHome",
  name: SITE_NAME,
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: LOGO_URL },
};

export function buildBreadcrumbJsonLd(
  items: { name: string; path?: string }[]
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
      })),
    ],
  };
}

export interface PersonSchemaInput {
  fullName: string;
  birthDate?: string | null;
  deathDate: string;
  description?: string | null;
  photoUrl?: string | null;
  city?: string | null;
  pageUrl: string;
}

/**
 * Person schema for memorials/obituaries — surfaces name, birth/death dates,
 * and image in Google rich results and knowledge panel candidates.
 */
export function buildPersonJsonLd(input: PersonSchemaInput): object {
  const image = abs(input.photoUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${input.pageUrl}#person`,
    name: input.fullName,
    ...(input.birthDate ? { birthDate: input.birthDate } : {}),
    deathDate: input.deathDate,
    ...(input.description ? { description: input.description } : {}),
    ...(image ? { image } : {}),
    ...(input.city
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: input.city,
            addressCountry: "CL",
          },
          deathPlace: { "@type": "Place", name: input.city },
        }
      : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": input.pageUrl },
  };
}

export interface ObituaryArticleInput {
  fullName: string;
  headline: string;
  description: string;
  pageUrl: string;
  photoUrl?: string | null;
  deathDate: string;
  birthDate?: string | null;
  modifiedAt?: string | null;
}

/**
 * Article schema specialized for obituaries — embeds the deceased as Person
 * via `about` so rich results can attach name + life dates to the snippet.
 */
export function buildObituaryArticleJsonLd(input: ObituaryArticleInput): object {
  const image = abs(input.photoUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${input.pageUrl}#article`,
    headline: input.headline,
    description: input.description,
    url: input.pageUrl,
    inLanguage: "es-CL",
    datePublished: input.deathDate,
    ...(input.modifiedAt ? { dateModified: input.modifiedAt } : {}),
    ...(image ? { image: [image] } : {}),
    about: {
      "@type": "Person",
      name: input.fullName,
      ...(input.birthDate ? { birthDate: input.birthDate } : {}),
      deathDate: input.deathDate,
    },
    publisher: PUBLISHER,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.pageUrl },
  };
}
