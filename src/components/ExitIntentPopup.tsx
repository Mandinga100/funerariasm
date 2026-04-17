import { useEffect, useState } from "react";
import SubscribeModal from "@/components/blog/SubscribeModal";
import { useExitIntent } from "@/hooks/use-exit-intent";

interface ExitIntentPopupProps {
  /** Slug de origen guardado en blog_subscribers.source. Por defecto "popup-salida". */
  source?: string;
  /** Retraso antes de armar la detección (ms). */
  armDelayMs?: number;
  /** Clave única de sesión para no repetir el popup en la misma navegación. */
  storageKey?: string;
}

/**
 * Popup de intención de salida que reutiliza <SubscribeModal /> con un `source` distintivo.
 * Se monta en Home y Blog para maximizar captura de emails antes del abandono.
 */
const ExitIntentPopup = ({
  source = "popup-salida",
  armDelayMs = 5000,
  storageKey = "exit-intent-shown",
}: ExitIntentPopupProps) => {
  const { triggered } = useExitIntent({ armDelayMs, storageKey });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (triggered) setOpen(true);
  }, [triggered]);

  return <SubscribeModal open={open} onOpenChange={setOpen} source={source} />;
};

export default ExitIntentPopup;
