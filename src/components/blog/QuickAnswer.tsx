import { Sparkles } from "lucide-react";

interface QuickAnswerProps {
  /** Short, extractable answer for AEO/LLMO. Max ~280 chars recommended. */
  children: React.ReactNode;
  label?: string;
}

/**
 * "Respuesta corta" block — optimized for featured snippets, AI Overviews
 * and LLM extraction. Renders semantic <aside role="note">.
 */
const QuickAnswer = ({ children, label = "Respuesta corta" }: QuickAnswerProps) => {
  return (
    <aside
      role="note"
      aria-label={label}
      className="not-prose my-8 relative overflow-hidden rounded-xl border border-gold/25 bg-gradient-to-br from-gold/[0.04] via-card to-card p-5 sm:p-6"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl pointer-events-none" />
      <div className="relative flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] tracking-wide-brand uppercase text-gold/80 font-medium mb-1.5">
            {label}
          </p>
          <div className="text-[15px] sm:text-base leading-relaxed text-foreground/90">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default QuickAnswer;
