import { useMemo, useState, useEffect, useCallback } from "react";
import { List, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  /** When true, render as sticky sidebar (desktop). */
  sticky?: boolean;
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

const TableOfContents = ({ content, sticky = false }: TableOfContentsProps) => {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [progress, setProgress] = useState(0);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the topmost visible heading
          const sorted = visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          setActiveId(sorted[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(id);
      }
      if (isMobile) setIsOpen(false);
    },
    [isMobile]
  );

  if (headings.length < 3) return null;

  const activeIndex = headings.findIndex((h) => h.id === activeId);

  return (
    <nav
      aria-label="Tabla de contenidos"
      className={cn(
        "relative bg-card border border-border/50 rounded-xl p-0 overflow-hidden",
        sticky ? "lg:sticky lg:top-24" : "mb-10"
      )}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-border/20">
        <div
          className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Header — clickable on mobile to toggle */}
      <button
        type="button"
        onClick={() => isMobile && setIsOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-5 pt-5 pb-3 text-left",
          isMobile && "cursor-pointer"
        )}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <List className="w-4 h-4 text-gold/60" />
          En este artículo
          <span className="text-[11px] text-muted-foreground/60 font-normal ml-1">
            ({headings.length} secciones)
          </span>
        </span>
        {isMobile && (
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      {/* List */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <ol className={cn("space-y-0.5 px-5 pb-5", sticky && "max-h-[60vh] overflow-y-auto")}>

          {headings.map((h, i) => {
            const isActive = h.id === activeId;
            const isPast = activeIndex >= 0 && i < activeIndex;

            return (
              <li
                key={h.id}
                className={cn(
                  "relative",
                  h.level === 3 ? "ml-4" : ""
                )}
              >
                {/* Active indicator line */}
                {h.level === 2 && (
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full transition-all duration-300",
                      isActive
                        ? "bg-gold scale-y-100"
                        : isPast
                        ? "bg-gold/20 scale-y-75"
                        : "bg-transparent scale-y-50"
                    )}
                    style={{ marginLeft: "-2px" }}
                  />
                )}
                <a
                  href={`#${h.id}`}
                  onClick={(e) => handleClick(e, h.id)}
                  className={cn(
                    "block text-sm py-1.5 pl-2 rounded-md transition-all duration-200 leading-relaxed",
                    isActive
                      ? "text-gold font-medium bg-gold/5"
                      : isPast
                      ? "text-muted-foreground/70 hover:text-gold/80"
                      : "text-muted-foreground hover:text-gold hover:bg-gold/5"
                  )}
                >
                  {h.level === 2 && (
                    <span className={cn(
                      "inline-block w-1.5 h-1.5 rounded-full mr-2 transition-colors duration-300 align-middle",
                      isActive ? "bg-gold" : isPast ? "bg-gold/30" : "bg-border"
                    )} />
                  )}
                  {h.text}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};

export default TableOfContents;
