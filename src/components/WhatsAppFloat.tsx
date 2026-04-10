import { useState, forwardRef } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";
import ChatboxFunerario from "./ChatboxFunerario";

const WhatsAppFloat = forwardRef<HTMLDivElement>((_props, ref) => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* Chatbox */}
      {chatOpen && <ChatboxFunerario onClose={() => setChatOpen(false)} />}

      {/* Toggle button */}
      <button
        onClick={() => setChatOpen(true)}
        className={`fixed bottom-20 right-3 sm:right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out ${
          chatOpen
            ? "scale-0 opacity-0 pointer-events-none"
            : "bg-gold text-accent-foreground hover:bg-gold-dark hover:scale-110 hover:shadow-[0_8px_30px_-6px_hsl(var(--gold)/0.5)] scale-100 opacity-100"
        }`}
        aria-label="Abrir chat"
      >
        <MessageCircle className="w-7 h-7" />
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
