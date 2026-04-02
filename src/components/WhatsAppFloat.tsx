import { useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";
import ChatboxFunerario, { ChatboxToggle } from "./ChatboxFunerario";

const WhatsAppFloat = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* Chatbox */}
      {chatOpen && <ChatboxFunerario onClose={() => setChatOpen(false)} />}
      <ChatboxToggle isOpen={chatOpen} toggle={() => setChatOpen(!chatOpen)} />

      {/* Emergency bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#8B0000] text-primary-foreground">
        <div className="container flex items-center justify-center gap-4 py-2.5">
          <span className="text-xs sm:text-sm font-medium">
            ¿Necesita ayuda inmediata?
          </span>
          <a
            href="tel:+56964333760"
            className="flex items-center gap-1.5 bg-primary-foreground/20 hover:bg-primary-foreground/30 px-3 py-1 rounded-full text-xs font-semibold transition-brand"
          >
            <Phone className="w-3 h-3" />
            Llamar ahora
          </a>
          <a
            href={buildWhatsAppUrlDirect("URGENTE: Necesito asistencia inmediata por un fallecimiento reciente.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#128C7E] px-3 py-1 rounded-full text-xs font-semibold transition-brand"
          >
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </a>
        </div>
      </div>
    </>
  );
};

export default WhatsAppFloat;
