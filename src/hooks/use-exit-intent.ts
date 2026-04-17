import { useEffect, useState } from "react";

interface UseExitIntentOptions {
  /** Storage key used to remember if popup was already shown/dismissed in this session. */
  storageKey?: string;
  /** Minimum delay (ms) after mount before exit-intent can fire. Avoids accidental triggers. */
  armDelayMs?: number;
  /** If true, also fires on mobile via scroll-up + idle heuristic. Defaults to true. */
  enableMobileHeuristic?: boolean;
  /** If false, ignores prior dismissal and always allows trigger. */
  respectDismissal?: boolean;
}

/**
 * Detecta intención de salida del usuario:
 *  - Desktop: mouseleave hacia el borde superior de la ventana.
 *  - Mobile: scroll-up rápido tras inactividad (heurística suave).
 *
 * Sólo se dispara una vez por sesión (sessionStorage) salvo que se reinicie con `reset()`.
 */
export function useExitIntent(options: UseExitIntentOptions = {}) {
  const {
    storageKey = "exit-intent-shown",
    armDelayMs = 4000,
    enableMobileHeuristic = true,
    respectDismissal = true,
  } = options;

  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (respectDismissal) {
      try {
        if (sessionStorage.getItem(storageKey) === "1") return;
      } catch {
        /* ignore storage errors */
      }
    }

    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, armDelayMs);

    const fire = () => {
      if (!armed || triggered) return;
      setTriggered(true);
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      // Sale por el borde superior (relatedTarget null + clientY <= 0)
      if (e.relatedTarget) return;
      if (e.clientY <= 0) fire();
    };

    let lastScrollY = window.scrollY;
    let lastMoveAt = Date.now();
    const handleScroll = () => {
      if (!enableMobileHeuristic) return;
      const now = Date.now();
      const delta = window.scrollY - lastScrollY;
      const idle = now - lastMoveAt > 8000;
      // Scroll hacia arriba rápido tras inactividad → posible abandono
      if (idle && delta < -120 && window.scrollY < 200) fire();
      lastScrollY = window.scrollY;
    };
    const markActive = () => {
      lastMoveAt = Date.now();
    };

    document.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mousemove", markActive);
    document.addEventListener("touchstart", markActive, { passive: true });

    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousemove", markActive);
      document.removeEventListener("touchstart", markActive);
    };
  }, [storageKey, armDelayMs, enableMobileHeuristic, respectDismissal, triggered]);

  const reset = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setTriggered(false);
  };

  return { triggered, reset, setTriggered };
}
