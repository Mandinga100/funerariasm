import { Share2, Check, Link2 } from "lucide-react";
import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  title: string;
}

/**
 * Premium social share buttons with official brand colors and refined hover animations.
 * Order: WhatsApp → Facebook → Instagram → X → Threads (+ copy link).
 * Instagram & Threads don't support native web-intent share, so they open the app/profile
 * with the URL pre-copied to clipboard for the user to paste.
 */
const ShareButtons = ({ url, title }: ShareButtonsProps) => {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  const shareToInstagram = async () => {
    await copyToClipboard();
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const shareToThreads = () => {
    // Threads supports a basic intent URL
    window.open(
      `https://www.threads.net/intent/post?text=${encodedTitle}%20${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // Brand colors as HSL via inline custom property — keeps semantic-token discipline
  // for everything else, while honoring official platform brand identity on share buttons only.
  const baseBadge =
    "group/share inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0";

  return (
    <section
      aria-label="Compartir artículo"
      className="mt-8 flex flex-wrap items-center gap-2.5"
    >
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
        <Share2 className="w-4 h-4" aria-hidden="true" />
        Compartir:
      </span>

      {/* WhatsApp — #25D366 */}
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartir por WhatsApp"
        className={`${baseBadge} border-transparent text-white hover:shadow-[0_8px_20px_-8px_rgba(37,211,102,0.6)]`}
        style={{ backgroundColor: "#25D366" }}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current transition-transform duration-300 group-hover/share:scale-110" aria-hidden="true">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
        WhatsApp
      </a>

      {/* Facebook — #1877F2 */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartir en Facebook"
        className={`${baseBadge} border-transparent text-white hover:shadow-[0_8px_20px_-8px_rgba(24,119,242,0.6)]`}
        style={{ backgroundColor: "#1877F2" }}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current transition-transform duration-300 group-hover/share:scale-110" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Facebook
      </a>

      {/* Instagram — gradient #FEDA75 → #FA7E1E → #D62976 → #962FBF → #4F5BD5 */}
      <button
        type="button"
        onClick={shareToInstagram}
        aria-label="Compartir en Instagram (copia el enlace)"
        className={`${baseBadge} border-transparent text-white hover:shadow-[0_8px_20px_-8px_rgba(214,41,118,0.6)]`}
        style={{
          background:
            "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)",
        }}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current transition-transform duration-300 group-hover/share:scale-110" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
        Instagram
      </button>

      {/* X (Twitter) — #000000 */}
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartir en X"
        className={`${baseBadge} border-transparent text-white hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)]`}
        style={{ backgroundColor: "#000000" }}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current transition-transform duration-300 group-hover/share:scale-110" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        X
      </a>

      {/* Threads — #000000 */}
      <button
        type="button"
        onClick={shareToThreads}
        aria-label="Compartir en Threads"
        className={`${baseBadge} border-transparent text-white hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)]`}
        style={{ backgroundColor: "#000000" }}
      >
        <svg viewBox="0 0 192 192" className="w-3.5 h-3.5 fill-current transition-transform duration-300 group-hover/share:scale-110" aria-hidden="true">
          <path d="M141.537 88.988c-.645-.31-1.3-.605-1.964-.892-1.156-21.31-12.799-33.51-32.342-33.635-.088 0-.176 0-.265 0-11.692 0-21.418 4.99-27.408 14.07l10.755 7.385c4.476-6.79 11.497-8.235 16.668-8.235.06 0 .119 0 .179 0 6.438.041 11.298 1.913 14.443 5.564 2.288 2.659 3.818 6.332 4.577 10.967-5.715-.97-11.893-1.268-18.504-.888-18.624 1.073-30.6 11.935-29.796 27.045.408 7.66 4.224 14.246 10.738 18.546 5.508 3.633 12.6 5.412 19.975 5.005 9.74-.535 17.385-4.25 22.717-11.045 4.048-5.16 6.612-11.85 7.741-20.255 4.661 2.812 8.116 6.518 10.026 10.973 3.247 7.578 3.436 20.026-6.717 30.171-8.892 8.884-19.582 12.728-35.726 12.847-17.92-.133-31.474-5.881-40.24-17.084C66.999 134.354 62.708 119.354 62.546 96c.162-23.354 4.453-38.354 12.668-48.582 8.766-11.203 22.32-16.951 40.24-17.084 18.057.134 31.853 5.91 41.025 17.165 4.493 5.516 7.892 12.45 10.106 20.642l13.142-3.503c-2.681-10.094-6.91-18.793-12.671-25.864-11.733-14.395-28.86-21.798-50.83-21.95C94.265 16.97 77.273 24.396 65.527 39.214 53.9 53.937 47.85 73.21 47.667 96l.002.092-.002.092c.183 22.79 6.233 42.063 17.86 56.785 11.746 14.818 28.738 22.244 50.69 22.405 19.71-.137 33.652-5.18 45.234-16.347 14.747-14.171 14.353-32.18 9.654-43.111-3.51-8.241-10.044-14.66-18.872-18.928zm-31.564 22.1c-7.26.401-14.847-2.838-15.221-9.85-.272-5.06 3.567-10.774 16.094-11.487 1.394-.077 2.756-.115 4.097-.115 4.595 0 8.83.443 12.572 1.276-1.428 17.747-9.95 19.844-17.542 20.176z"/>
        </svg>
        Threads
      </button>

      {/* Copy link — neutral */}
      <button
        type="button"
        onClick={copyToClipboard}
        aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
        className={`${baseBadge} border-border bg-card text-muted-foreground hover:text-gold hover:border-gold/40 hover:shadow-[0_8px_20px_-8px_hsl(var(--gold)/0.4)]`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 transition-transform duration-300 scale-110" />
            Copiado
          </>
        ) : (
          <>
            <Link2 className="w-3.5 h-3.5 transition-transform duration-300 group-hover/share:scale-110" />
            Copiar
          </>
        )}
      </button>
    </section>
  );
};

export default ShareButtons;
