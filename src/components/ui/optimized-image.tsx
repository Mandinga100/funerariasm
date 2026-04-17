import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Use "eager" for above-the-fold hero images, "lazy" (default) for everything else */
  priority?: boolean;
  /** Optional blur placeholder color while loading */
  placeholderColor?: string;
  /** Enable fade-in animation on load */
  fadeIn?: boolean;
  /** Disable automatic <picture> + WebP source generation (for .jpg/.jpeg srcs) */
  disableWebp?: boolean;
  /** Responsive widths available as `${name}-${w}w.${ext}` siblings (e.g. [400, 800]) */
  responsiveWidths?: number[];
  /** Sizes attribute for responsive images. Defaults to a card-friendly value. */
  sizes?: string;
}

const isJpegSrc = (src?: string) =>
  !!src && /\.(jpe?g)(\?.*)?$/i.test(src) && !src.startsWith("data:");

const toWebp = (src: string) => src.replace(/\.(jpe?g)(\?.*)?$/i, ".webp$2");

/** Hero category images that ship with -400w/-800w variants */
const HERO_RESPONSIVE_PATTERN = /\/assets\/images\/blog\/[a-z-]+-hero\.(jpe?g|webp)(\?.*)?$/i;
const DEFAULT_HERO_WIDTHS = [400, 800];

const buildSrcSet = (src: string, widths: number[]) =>
  widths
    .map((w) => `${src.replace(/\.(jpe?g|webp)(\?.*)?$/i, `-${w}w.$1$2`)} ${w}w`)
    .join(", ");

/**
 * OptimizedImage — drop-in <img> replacement with:
 * - Native lazy loading (default)
 * - `decoding="async"` for non-blocking decode
 * - `fetchpriority` hint for LCP images
 * - Fade-in transition on load
 * - Placeholder background while loading
 * - Automatic <picture> + WebP source for .jpg/.jpeg srcs (modern format fallback)
 */
const OptimizedImage = ({
  priority = false,
  placeholderColor = "hsl(var(--muted))",
  fadeIn = true,
  disableWebp = false,
  className,
  alt = "",
  style,
  onLoad,
  src,
  responsiveWidths,
  sizes,
  ...props
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle already-cached images (complete before onLoad fires)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  // Auto-detect responsive widths for known hero images if not explicitly provided
  const isHero =
    typeof src === "string" && HERO_RESPONSIVE_PATTERN.test(src);
  const widths =
    responsiveWidths && responsiveWidths.length > 0
      ? responsiveWidths
      : isHero
      ? DEFAULT_HERO_WIDTHS
      : undefined;
  const resolvedSizes =
    sizes ?? (isHero ? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" : undefined);

  const jpegSrcSet =
    typeof src === "string" && isJpegSrc(src) && widths
      ? buildSrcSet(src, widths)
      : undefined;
  const webpSrc = typeof src === "string" && isJpegSrc(src) ? toWebp(src) : undefined;
  const webpSrcSet = webpSrc && widths ? buildSrcSet(webpSrc, widths) : undefined;

  const img = (
    <img
      ref={imgRef}
      src={src}
      srcSet={jpegSrcSet}
      sizes={resolvedSizes}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        fadeIn && "transition-opacity duration-500",
        fadeIn && !loaded && "opacity-0",
        fadeIn && loaded && "opacity-100",
        className
      )}
      style={{
        backgroundColor: !loaded ? placeholderColor : undefined,
        ...style,
      }}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      {...props}
    />
  );

  if (!disableWebp && webpSrc) {
    return (
      <picture>
        <source
          type="image/webp"
          srcSet={webpSrcSet ?? webpSrc}
          sizes={resolvedSizes}
        />
        {img}
      </picture>
    );
  }

  return img;
};

export default OptimizedImage;
