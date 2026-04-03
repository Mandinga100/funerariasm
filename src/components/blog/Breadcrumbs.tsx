import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://funerariasantamargarita.cl" },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.label,
        ...(item.href ? { item: `https://funerariasantamargarita.cl${item.href}` } : {}),
      })),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-primary-foreground/40 mb-6 flex-wrap">
        <Link to="/" className="hover:text-gold transition-colors flex items-center gap-1">
          <Home className="w-3 h-3" /> Inicio
        </Link>
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3" />
            {item.href ? (
              <Link to={item.href} className="hover:text-gold transition-colors">{item.label}</Link>
            ) : (
              <span className="text-primary-foreground/60">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
};

export default Breadcrumbs;
