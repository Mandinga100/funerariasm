import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FloatingCTAProps {
  message?: string;
  /** Show after user has scrolled past this fraction of the page (0-1). */
  triggerAt?: number;
}

/**
 * Discreet floating CTA that appears after the reader has engaged with content.
 * Dismissible, non-intrusive, mobile-first. Sits well above the global
 * WhatsAppFloat / "ayuda inmediata" bar to remain fully legible.
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
        // Raised well above the global WhatsApp bar / immediate-help footer
        // Mobile: bottom-44 keeps it clear of the dark "ayuda inmediata" bar
        // Desktop: bottom-28 sits above WhatsApp float
        "fixed z-40 left-3 right-20 sm:left-auto sm:right-24 bottom-44 sm:bottom-28 sm:max-w-sm",
        "transition-all duration-500 ease-out",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <div className="relative bg-card border border-gold/30 rounded-xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] p-4 pr-10">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <p className="text-sm font-medium text-foreground leading-snug mb-1">
          {message}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Atención profesional 24/7, todos los días del año.
        </p>
        <Link
          to="/contacto"
          className="inline-flex items-center gap-1.5 bg-gold hover:bg-gold-dark text-accent-foreground px-4 py-2 rounded-full text-xs font-medium transition-brand shadow-[0_4px_14px_-4px_rgba(197,160,89,0.5)] hover:shadow-[0_6px_18px_-4px_rgba(197,160,89,0.7)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <Sparkles className="w-3 h-3" /> Orientación Personalizada
        </Link>
      </div>
    </div>
  );
};

export default FloatingCTA;
