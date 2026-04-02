import { MessageCircle, Phone } from "lucide-react";

const WHATSAPP_NUMBER = "56964333760";

const buildWhatsAppUrl = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

const WhatsAppFloat = () => (
  <>
    {/* Floating WhatsApp button */}
    <a
      href={buildWhatsAppUrl("Hola, necesito información sobre sus servicios funerarios.")}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-5 z-40 bg-[#25D366] hover:bg-[#128C7E] text-primary-foreground w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-brand hover:scale-110 group"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
      <span className="absolute right-full mr-3 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-brand pointer-events-none">
        Escríbenos por WhatsApp
      </span>
    </a>

    {/* Emergency bar - bottom fixed */}
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
          href={buildWhatsAppUrl("URGENTE: Necesito asistencia inmediata por un fallecimiento reciente.")}
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

export default WhatsAppFloat;
export { buildWhatsAppUrl, WHATSAPP_NUMBER };
