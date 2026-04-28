import { useState, useEffect, useRef, forwardRef } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";
import ChatboxFunerario from "./ChatboxFunerario";
import { useChatLiveSync } from "@/hooks/use-chat-live-sync";

const WhatsAppFloat = forwardRef<HTMLDivElement>((_props, ref) => {
  // Tres estados de la ventana del chat:
  //  - mounted=false: nunca se ha abierto en esta sesión, no se renderiza.
  //  - mounted=true + open=true: visible.
  //  - mounted=true + open=false: minimizado (oculto pero el componente sigue
  //    vivo, conservando historial y estado).
  // Solo la X dispara hardClose: desmonta el componente y resetea historial.
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const chatWrapperRef = useRef<HTMLDivElement | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);

  // Sincronización a nivel del botón flotante: detecta respuestas del operador
  // aunque el chatbox no esté montado (visitante cerró/recargó la página).
  // Cuando hay mensajes nuevos, mostramos badge y ping en el botón.
  const live = useChatLiveSync({ visible: open });
  const hasUnseen = !open && live.unseenCount > 0;

  function handleOpen() {
    setMounted(true);
    setOpen(true);
    live.markSeen();
  }

  // Si llega un mensaje del operador y el chat está totalmente desmontado
  // (el visitante cerró con la X y luego el operador respondió), volvemos a
  // montar el componente — sin abrirlo — para que cargue el historial vía
  // el hook live y quede listo cuando el visitante haga click.
  useEffect(() => {
    if (!mounted && live.unseenCount > 0) {
      setMounted(true);
    }
  }, [live.unseenCount, mounted]);

  // Minimizar (click-outside o flecha): conserva historial y estado.
  function handleMinimize() {
    setOpen(false);
  }

  // Cierre real (X): destruye el componente y resetea la conversación.
  function handleHardClose() {
    setOpen(false);
    setMounted(false);
    setResetKey((k) => k + 1);
  }

  // Click-outside: solo cuando está visible, ignora clicks en el botón flotante.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (chatWrapperRef.current?.contains(target)) return;
      if (toggleBtnRef.current?.contains(target)) return;
      handleMinimize();
    }
    // Pequeño delay para evitar capturar el mismo click que abre el chat.
    const t = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Escape también minimiza suavemente.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleMinimize();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {mounted && (
        <div ref={chatWrapperRef}>
          <ChatboxFunerario
            key={resetKey}
            isOpen={open}
            onMinimize={handleMinimize}
            onHardClose={handleHardClose}
            live={live}
            inboundBatch={live.newMessages}
          />
        </div>
      )}

      {/* Toggle button */}
      <button
        ref={toggleBtnRef}
        onClick={handleOpen}
        className={`fixed bottom-20 right-3 sm:right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out ${
          open
            ? "scale-0 opacity-0 pointer-events-none"
            : "bg-gold text-accent-foreground hover:bg-gold-dark hover:scale-110 hover:shadow-[0_8px_30px_-6px_hsl(var(--gold)/0.5)] scale-100 opacity-100"
        }`}
        aria-label={hasUnseen ? `Abrir chat — ${live.unseenCount} mensajes nuevos del asesor` : "Abrir chat"}
      >
        <MessageCircle className="w-7 h-7" />
        {hasUnseen && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" aria-hidden="true" />
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-background shadow-md">
              {live.unseenCount > 9 ? "9+" : live.unseenCount}
            </span>
          </>
        )}
      </button>

      {/* Emergency bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground">
        <div className="container flex items-center justify-center gap-3 sm:gap-4 py-2.5">
          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
            ¿Necesita ayuda inmediata?
          </span>
          <a
            href="tel:+56964333760"
            className="group flex items-center gap-1.5 bg-gold hover:bg-gold-dark text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-all duration-200"
          >
            <Phone className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-rotate-12" />
            Llamar ahora
          </a>
          <a
            href={buildWhatsAppUrlDirect("URGENTE: Necesito asistencia inmediata por un fallecimiento reciente.")}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 bg-gold hover:bg-gold-dark text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-all duration-200"
          >
            <MessageCircle className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
            WhatsApp
          </a>
        </div>
      </div>
    </>
  );
});

WhatsAppFloat.displayName = "WhatsAppFloat";
export default WhatsAppFloat;
