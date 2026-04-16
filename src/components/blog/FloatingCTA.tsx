import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface FloatingCTAProps {
  message?: string;
  /** Show after user has scrolled past this fraction of the page (0-1). */
  triggerAt?: number;
}

/**
 * Discreet floating CTA that appears after the reader has engaged with content.
 * Dismissible, non-intrusive, mobile-first. Complements (does not replace) the
 * existing global WhatsAppFloat component — uses different position to avoid overlap.
 */
const FloatingCTA = ({
  message = "¿Necesita orientación funeraria?",
  triggerAt = 0.35,
}: FloatingCTAProps) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const ratio = window.scrollY / total;
      setVisible(ratio > triggerAt && ratio < 0.95);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [triggerAt]);

  if (dismissed) return null;

  return (
    <div
      role="complementary"
      aria-hidden={!visible}
      className={cn(
        "fixed z-40 left-4 right-4 sm:left-auto sm:right-6 bottom-24 sm:bottom-6 sm:max-w-sm",
        "transition-all duration-500 ease-out",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <div className="relative bg-card border border-gold/30 rounded-xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] p-4 pr-10">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <p className="text-sm font-medium text-foreground leading-snug mb-2.5">
          {message}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Atención profesional 24/7, todos los días del año.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="tel:+56964333760"
            className="inline-flex items-center gap-1.5 bg-gold hover:bg-gold-dark text-accent-foreground px-3 py-1.5 rounded-full text-xs font-medium transition-brand"
          >
            <Phone className="w-3 h-3" /> Llamar ahora
          </a>
          <a
            href={buildWhatsAppUrlDirect("Hola, leí un artículo del blog y necesito orientación.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-border bg-background hover:border-gold/40 hover:text-gold text-foreground px-3 py-1.5 rounded-full text-xs font-medium transition-brand"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default FloatingCTA;
