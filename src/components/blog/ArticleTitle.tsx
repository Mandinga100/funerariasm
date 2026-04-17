import { BookOpen } from "lucide-react";

interface ArticleTitleProps {
  title: string;
}

/**
 * Premium opening title for blog articles. Replaces the raw `# Title` markdown
 * with a visually distinguished, professional element: gold accent rule + icon
 * badge + serif italic headline. Renders inside the article body so it lives
 * above the first paragraph but below the hero.
 */
const ArticleTitle = ({ title }: ArticleTitleProps) => {
  return (
    <div className="not-prose relative my-8 first:mt-0">
      {/* Top gold accent rule */}
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-9 rounded-lg bg-gradient-to-br from-gold/15 to-gold/5 border border-gold/25 flex items-center justify-center shrink-0 shadow-[0_2px_12px_-4px_rgba(197,160,89,0.3)]">
          <BookOpen className="w-4 h-4 text-gold" aria-hidden="true" />
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/40 via-gold/15 to-transparent" />
      </div>

      <h2
        className="font-playfair italic text-2xl sm:text-[1.7rem] md:text-3xl leading-[1.2] text-foreground tracking-tight"
        // Use h2 visually since the page already renders h1 in the hero header.
      >
        {title}
      </h2>

      {/* Bottom subtle separator */}
      <div className="mt-5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-gold/60" aria-hidden="true" />
        <span className="w-1 h-1 rounded-full bg-gold/30" aria-hidden="true" />
        <span className="w-0.5 h-0.5 rounded-full bg-gold/20" aria-hidden="true" />
      </div>
    </div>
  );
};

export default ArticleTitle;
