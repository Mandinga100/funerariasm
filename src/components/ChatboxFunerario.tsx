import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Phone, ArrowRight, Bot, User } from "lucide-react";
import { buildWhatsAppUrl, type ContactIntent } from "@/lib/whatsapp";
import { submitContact } from "@/lib/contacts";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  chips?: ChatChip[];
}

interface ChatChip {
  label: string;
  action: () => void;
}

type ChatMode = "tree" | "ai";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Bienvenido/a a Funeraria Santa Margarita. Estamos aquí para acompañarle. ¿En qué podemos ayudarle hoy?",
  chips: [],
};

const MAIN_OPTIONS = [
  { label: "🔴 Necesito ayuda inmediata", intent: "fallecimiento" as ContactIntent },
  { label: "💰 Cotizar un servicio", intent: "cotizacion" as ContactIntent },
  { label: "📋 Planificar a futuro", intent: "planificacion" as ContactIntent },
  { label: "🔥 Cremación / Sepultura", intent: "cremacion" as ContactIntent },
  { label: "📄 Ver planes funerarios", intent: "planificacion" as ContactIntent },
  { label: "🕯️ Obituarios / Memoriales", intent: "memorial" as ContactIntent },
  { label: "💬 Hablar con una persona", intent: "general" as ContactIntent },
  { label: "🤖 Hablar con asistente virtual", intent: "general" as ContactIntent },
];

const TREE_RESPONSES: Record<string, { message: string; showContact?: boolean; link?: string }> = {
  fallecimiento: {
    message:
      "Entendemos lo difícil de este momento. Estamos disponibles ahora mismo para acompañarle. Le recomendamos comunicarse de inmediato:",
    showContact: true,
  },
  cotizacion: {
    message:
      "Con gusto le ayudamos a encontrar el plan más adecuado. Tenemos opciones desde $1.290.000 hasta servicios premium. ¿Desea que un asesor le contacte por WhatsApp?",
    showContact: true,
  },
  planificacion: {
    message:
      "Planificar con anticipación es un acto de amor. Le ofrecemos asesoría personalizada sin compromiso para elegir el plan que mejor se adapte a sus necesidades.",
    showContact: true,
    link: "/planes",
  },
  cremacion: {
    message:
      "Ofrecemos servicios de cremación profesional con sala de despedida, urna ceremonial y acompañamiento integral. ¿Le gustaría recibir más detalles?",
    showContact: true,
  },
  memorial: {
    message:
      "Puede explorar nuestros obituarios y memoriales virtuales, dejar condolencias o encender una vela virtual en honor a su ser querido.",
    link: "/memoriales",
  },
  general: {
    message:
      "Nuestro equipo está disponible 24/7 para atenderle. ¿Cómo prefiere comunicarse?",
    showContact: true,
  },
};

const ChatboxFunerario = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [mode, setMode] = useState<ChatMode>("tree");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMainOptions, setShowMainOptions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTreeOption = async (label: string, intent: ContactIntent) => {
    const isAI = label.includes("asistente virtual");

    setMessages((prev) => [...prev, { role: "user", content: label }]);
    setShowMainOptions(false);

    if (isAI) {
      setMode("ai");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Soy el asistente virtual de Funeraria Santa Margarita. Puede hacerme cualquier pregunta sobre nuestros servicios. ¿En qué puedo ayudarle?",
        },
      ]);
      return;
    }

    const response = TREE_RESPONSES[intent] || TREE_RESPONSES.general;

    // Log interaction
    try {
      await submitContact({
        contactType: "chatbox",
        intent,
        source: "chatbox",
        urgency: intent === "fallecimiento" ? "immediate" : "normal",
      });
    } catch {
      // non-blocking
    }

    const chips: ChatChip[] = [];
    if (response.showContact) {
      chips.push({
        label: "📞 Llamar ahora",
        action: () => window.open("tel:+56964333760"),
      });
      chips.push({
        label: "💬 WhatsApp",
        action: () =>
          window.open(buildWhatsAppUrl({ intent }), "_blank"),
      });
    }
    if (response.link) {
      chips.push({
        label: "🔗 Ver más",
        action: () => (window.location.href = response.link!),
      });
    }
    chips.push({
      label: "↩️ Volver al inicio",
      action: () => {
        setMessages([GREETING]);
        setShowMainOptions(true);
        setMode("tree");
      },
    });

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: response.message, chips },
    ]);
  };

  const handleAIMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg = inputText.trim();
    setInputText("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    // Build message history for AI
    const aiMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));
    aiMessages.push({ role: "user", content: userMsg });

    let assistantContent = "";

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-funerario`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: aiMessages }),
        }
      );

      if (!resp.ok || !resp.body) {
        throw new Error("Error en la respuesta");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && !last.chips) {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            // partial JSON, wait for more
          }
        }
      }
    } catch (e) {
      console.error("Chat AI error:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Disculpe, no pude procesar su consulta en este momento. Le recomiendo comunicarse directamente con nuestro equipo.",
          chips: [
            { label: "📞 Llamar", action: () => window.open("tel:+56964333760") },
            { label: "💬 WhatsApp", action: () => window.open(buildWhatsAppUrl({ intent: "general" }), "_blank") },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null; // Rendered by ChatboxToggle

  return (
    <div className="fixed bottom-20 right-5 z-50 w-[360px] max-w-[calc(100vw-40px)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up"
      style={{ height: "min(520px, calc(100vh - 140px))" }}
    >
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="font-playfair text-sm font-medium">Santa Margarita</p>
            <p className="text-[10px] text-primary-foreground/60 tracking-wide-brand uppercase">
              {mode === "ai" ? "Asistente Virtual" : "Atención 24/7"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-primary-foreground/60 hover:text-primary-foreground transition-brand p-1"
          aria-label="Cerrar chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-soft-gray/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="flex items-start gap-2 max-w-[85%]">
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-gold" />
                </div>
              )}
              <div>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-background border border-border text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.chips && msg.chips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.chips.map((chip, ci) => (
                      <button
                        key={ci}
                        onClick={chip.action}
                        className="text-xs bg-background border border-gold/30 text-foreground hover:bg-gold/10 px-3 py-1.5 rounded-full transition-brand"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-foreground" />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Main options */}
        {showMainOptions && (
          <div className="grid grid-cols-1 gap-2">
            {MAIN_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleTreeOption(opt.label, opt.intent)}
                className="text-left text-sm bg-background border border-border hover:border-gold/40 hover:bg-gold/5 rounded-xl px-4 py-3 transition-brand flex items-center justify-between"
              >
                <span>{opt.label}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gold" />
              </div>
              <div className="bg-background border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input (AI mode) */}
      {mode === "ai" && (
        <div className="p-3 bg-background border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAIMessage()}
              placeholder="Escriba su consulta..."
              className="flex-1 bg-soft-gray border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gold/50 transition-brand"
              disabled={isLoading}
            />
            <button
              onClick={handleAIMessage}
              disabled={isLoading || !inputText.trim()}
              className="w-9 h-9 rounded-full bg-gold text-accent-foreground flex items-center justify-center hover:bg-gold-dark transition-brand disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              setMessages([GREETING]);
              setShowMainOptions(true);
              setMode("tree");
            }}
            className="text-xs text-muted-foreground hover:text-gold mt-2 transition-brand"
          >
            ← Volver al menú principal
          </button>
        </div>
      )}

      {/* Quick actions (tree mode) */}
      {mode === "tree" && !showMainOptions && (
        <div className="p-3 bg-background border-t border-border shrink-0 flex gap-2">
          <a
            href="tel:+56964333760"
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-full text-xs font-medium"
          >
            <Phone className="w-3 h-3" /> Llamar
          </a>
          <a
            href={buildWhatsAppUrl({ intent: "general" })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-primary-foreground py-2.5 rounded-full text-xs font-medium"
          >
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
};

// Separate toggle button component
export const ChatboxToggle = ({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) => (
  <button
    onClick={toggle}
    className={`fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-brand ${
      isOpen ? "bg-primary text-primary-foreground scale-0 opacity-0" : "bg-gold text-accent-foreground hover:bg-gold-dark hover:scale-110 scale-100 opacity-100"
    }`}
    aria-label={isOpen ? "Cerrar chat" : "Abrir chat"}
  >
    <MessageCircle className="w-7 h-7" />
  </button>
);

export default ChatboxFunerario;
