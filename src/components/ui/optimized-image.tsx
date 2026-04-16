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
}

const isJpegSrc = (src?: string) =>
  !!src && /\.(jpe?g)(\?.*)?$/i.test(src) && !src.startsWith("data:");

const toWebp = (src: string) => src.replace(/\.(jpe?g)(\?.*)?$/i, ".webp$2");

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

  const img = (
    <img
      ref={imgRef}
      src={src}
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

  if (!disableWebp && typeof src === "string" && isJpegSrc(src)) {
    return (
      <picture>
        <source type="image/webp" srcSet={toWebp(src)} />
        {img}
      </picture>
    );
  }

  return img;
};

export default OptimizedImage;
