import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export interface NextStep {
  title: string;
  description: string;
  href?: string;
  cta?: string;
  external?: boolean;
}

interface NextStepsProps {
  steps: NextStep[];
  title?: string;
}

/**
 * "Qué hacer ahora" — 3 actionable steps. Semantic <section> with <ol>
 * for screen-reader friendly ordered guidance. Optimized for AEO.
 */
const NextSteps = ({ steps, title = "Qué hacer ahora" }: NextStepsProps) => {
  if (!steps?.length) return null;

  return (
    <section
      aria-labelledby="next-steps-heading"
      className="not-prose my-10 rounded-xl border border-border/60 bg-card overflow-hidden"
    >
      <header className="px-6 py-5 border-b border-border/40 bg-gradient-to-r from-card to-gold/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 id="next-steps-heading" className="font-playfair text-xl text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pasos concretos que puede dar hoy mismo
            </p>
          </div>
        </div>
      </header>

      <ol className="divide-y divide-border/40">
        {steps.map((step, i) => (
          <li key={i} className="px-6 py-5 flex gap-4 items-start">
            <span
              aria-hidden="true"
              className="w-7 h-7 rounded-full border border-gold/30 bg-gold/5 flex items-center justify-center text-sm font-semibold text-gold shrink-0 mt-0.5"
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-foreground leading-snug">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                {step.description}
              </p>
              {step.href && step.cta && (
                step.external || step.href.startsWith("http") || step.href.startsWith("tel:") ? (
                  <a
                    href={step.href}
                    target={step.external ? "_blank" : undefined}
                    rel={step.external ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1.5 text-sm text-gold hover:text-gold-light underline underline-offset-2 mt-2.5 transition-colors"
                  >
                    {step.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <Link
                    to={step.href}
                    className="inline-flex items-center gap-1.5 text-sm text-gold hover:text-gold-light underline underline-offset-2 mt-2.5 transition-colors"
                  >
                    {step.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default NextSteps;
