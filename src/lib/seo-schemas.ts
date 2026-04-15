const SITE_URL = "https://funerariasantamargarita.cl";

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
