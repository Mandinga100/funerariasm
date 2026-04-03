import { useMemo } from "react";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

export function extractHeadings(content: string): TocItem[] {
  const lines = content.split("\n");
  const headings: TocItem[] = [];
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, "").trim();
      const id = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      headings.push({ id, text, level });
    }
  }
  return headings;
}

const TableOfContents = ({ content }: TableOfContentsProps) => {
  const headings = useMemo(() => extractHeadings(content), [content]);

  if (headings.length < 3) return null;

  return (
    <nav
      aria-label="Tabla de contenidos"
      className="bg-card border border-border/50 rounded-lg p-5 mb-10"
    >
      <h2 className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
        <List className="w-4 h-4 text-gold/60" />
        En este artículo
      </h2>
      <ol className="space-y-1.5">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? "ml-4" : ""}>
            <a
              href={`#${h.id}`}
              className="text-sm text-muted-foreground hover:text-gold transition-colors leading-relaxed"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default TableOfContents;
