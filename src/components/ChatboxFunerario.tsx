import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Phone, User, ArrowLeft, Mic, MicOff } from "lucide-react";
import { buildWhatsAppUrl, buildWhatsAppUrlDirect, type ContactIntent } from "@/lib/whatsapp";
import { submitContact } from "@/lib/contacts";
import assistantAvatar from "@/assets/assistant-avatar.png";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  chips?: ChatChip[];
}

interface ChatChip {
  label: string;
  action: () => void;
}

interface ContactFormData {
  name: string;
  rut: string;
  phone: string;
}

type ChatMode = "tree" | "ai";
type ContactStep = "idle" | "name" | "rut" | "phone" | "done";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Bienvenido/a a Funeraria Santa Margarita. Estamos aquí para acompañarle con profesionalismo y calidez. ¿En qué podemos ayudarle?",
};

const MAIN_OPTIONS = [
  { label: "🔴 Ayuda inmediata", intent: "fallecimiento" as ContactIntent },
  { label: "💰 Cotizar servicio", intent: "cotizacion" as ContactIntent },
  { label: "📋 Planificar a futuro", intent: "planificacion" as ContactIntent },
  { label: "🤖 Asistente virtual", intent: "general" as ContactIntent },
];

const TREE_RESPONSES: Record<string, { message: string; showContact?: boolean; link?: string }> = {
  fallecimiento: {
    message:
      "Entendemos lo difícil de este momento. Nuestro equipo está disponible ahora mismo para acompañarle.\n\n¿Desea que un asesor le contacte de inmediato por WhatsApp?",
    showContact: true,
  },
  cotizacion: {
    message:
      "Con gusto le ayudamos. Tenemos planes desde $1.290.000 hasta servicios premium personalizados.\n\n¿Le gustaría recibir una cotización personalizada por WhatsApp?",
    showContact: true,
  },
  planificacion: {
    message:
      "Planificar con anticipación es un acto de amor. Le ofrecemos asesoría sin compromiso para elegir el plan ideal.\n\n¿Desea que un asesor le contacte?",
    showContact: true,
    link: "/planes",
  },
};

// Web Speech API types
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

const ChatboxFunerario = ({ onClose }: { onClose: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [mode, setMode] = useState<ChatMode>("tree");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMainOptions, setShowMainOptions] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<ContactIntent>("general");
  const [contactStep, setContactStep] = useState<ContactStep>("idle");
  const [contactData, setContactData] = useState<ContactFormData>({ name: "", rut: "", phone: "" });
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClose = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    }
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 350);
  }, [onClose]);

  const resetChat = useCallback(() => {
    setMessages([GREETING]);
    setShowMainOptions(true);
    setMode("tree");
    setContactStep("idle");
    setContactData({ name: "", rut: "", phone: "" });
    setInputText("");
  }, []);

  // Voice input via Web Speech API
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Su navegador no soporta reconocimiento de voz. Por favor, escriba su mensaje." },
      ]);
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-CL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const startContactCollection = (intent: ContactIntent) => {
    setCurrentIntent(intent);
    setContactStep("name");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Para contactarle de forma personalizada, necesito algunos datos.\n\n¿Cuál es su nombre completo?" },
    ]);
  };

  const handleContactInput = async (value: string) => {
    setMessages((prev) => [...prev, { role: "user", content: value }]);

    if (contactStep === "name") {
      setContactData((prev) => ({ ...prev, name: value }));
      setContactStep("rut");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Gracias. ¿Cuál es su RUT? (ej: 12.345.678-9)" },
      ]);
    } else if (contactStep === "rut") {
      setContactData((prev) => ({ ...prev, rut: value }));
      setContactStep("phone");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "¿Y su número de teléfono de contacto? (ej: +56 9 1234 5678)" },
      ]);
    } else if (contactStep === "phone") {
      const finalData = { ...contactData, phone: value };
      setContactData(finalData);
      setContactStep("done");

      try {
        await submitContact({
          contactType: "chatbox",
          name: finalData.name,
          phone: finalData.phone,
          intent: currentIntent,
          source: "chatbox",
          message: `RUT: ${finalData.rut}`,
          urgency: currentIntent === "fallecimiento" ? "immediate" : "normal",
        });
      } catch { /* non-blocking */ }

      const intentLabels: Record<string, string> = {
        fallecimiento: "asistencia inmediata por fallecimiento",
        cotizacion: "cotización de servicio funerario",
        planificacion: "planificación de servicio a futuro",
      };
      const serviceDesc = intentLabels[currentIntent] || "consulta general";
      const whatsappMsg = `Hola, soy ${finalData.name} (RUT: ${finalData.rut}). Necesito ${serviceDesc}. Mi número de contacto es ${finalData.phone}. Agradezco su pronta respuesta.`;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Perfecto, ${finalData.name}. Hemos registrado sus datos. Un asesor le contactará a la brevedad.\n\nTambién puede iniciar la conversación directamente:`,
          chips: [
            { label: "💬 Abrir WhatsApp", action: () => window.open(buildWhatsAppUrlDirect(whatsappMsg), "_blank") },
            { label: "📞 Llamar ahora", action: () => window.open("tel:+56964333760") },
            { label: "↩️ Nueva consulta", action: resetChat },
          ],
        },
      ]);
    }
  };

  const handleTreeOption = async (label: string, intent: ContactIntent) => {
    const isAI = label.includes("Asistente");
    setMessages((prev) => [...prev, { role: "user", content: label }]);
    setShowMainOptions(false);

    if (isAI) {
      setMode("ai");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Soy la asistente virtual de Funeraria Santa Margarita. Puede hacerme cualquier pregunta sobre nuestros servicios, planes y procesos. También puede usar el micrófono para hablar. ¿En qué puedo ayudarle?" },
      ]);
      return;
    }

    const response = TREE_RESPONSES[intent] || TREE_RESPONSES.fallecimiento;
    try {
      await submitContact({ contactType: "chatbox", intent, source: "chatbox", urgency: intent === "fallecimiento" ? "immediate" : "normal" });
    } catch { /* non-blocking */ }

    const chips: ChatChip[] = [];
    if (response.showContact) {
      chips.push({ label: "✅ Sí, contactarme", action: () => startContactCollection(intent) });
      chips.push({ label: "📞 Llamar directo", action: () => window.open("tel:+56964333760") });
    }
    if (response.link) {
      chips.push({ label: "🔗 Ver planes", action: () => (window.location.href = response.link!) });
    }
    chips.push({ label: "↩️ Volver al inicio", action: resetChat });

    setMessages((prev) => [...prev, { role: "assistant", content: response.message, chips }]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const value = inputText.trim();
    setInputText("");

    if (contactStep !== "idle" && contactStep !== "done") {
      handleContactInput(value);
      return;
    }

    if (mode === "ai") {
      await handleAIMessage(value);
    }
  };

  const handleAIMessage = async (userMsg: string) => {
    if (isLoading) return;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

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

      if (!resp.ok || !resp.body) throw new Error("Error en la respuesta");

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
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (e) {
      console.error("Chat AI error:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Disculpe, no pude procesar su consulta. Le recomiendo comunicarse directamente:",
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

  const showInput = mode === "ai" || (contactStep !== "idle" && contactStep !== "done");

  const getPlaceholder = () => {
    if (contactStep === "name") return "Ingrese su nombre completo...";
    if (contactStep === "rut") return "Ingrese su RUT...";
    if (contactStep === "phone") return "Ingrese su teléfono...";
    return "Escriba su consulta...";
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-350 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Chat window */}
      <div
        ref={chatRef}
        className={`fixed z-50 bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isClosing
            ? "opacity-0 scale-[0.15] duration-350"
            : "opacity-100 scale-100 duration-300 animate-fade-in-up"
        }`}
        style={{
          width: "min(calc(100vw - 24px), 380px)",
          height: "min(560px, calc(100vh - 140px))",
          bottom: isClosing ? "5rem" : "5rem",
          right: isClosing ? "0.75rem" : "0.75rem",
          transformOrigin: "bottom right",
        }}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-3 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold/40 shrink-0">
              <img src={assistantAvatar} alt="Asistente virtual" className="w-full h-full object-cover" loading="lazy" width={40} height={40} />
            </div>
            <div>
              <p className="font-playfair text-sm font-semibold leading-tight">Santa Margarita</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-[10px] text-primary-foreground/70 tracking-wider uppercase">
                  {mode === "ai" ? "Asistente IA" : "En línea · 24/7"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-primary-foreground/60 hover:text-primary-foreground transition-all duration-300 p-1.5 rounded-full hover:bg-primary-foreground/10"
            aria-label="Cerrar chat"
          >
            <X className={`w-5 h-5 transition-transform duration-300 ${isClosing ? "rotate-90 scale-75" : ""}`} />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 bg-soft-gray/30"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start gap-2 ${msg.role === "user" ? "max-w-[80%]" : "max-w-[88%]"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-gold/30 shrink-0 mt-1">
                    <img src={assistantAvatar} alt="" className="w-full h-full object-cover" width={28} height={28} />
                  </div>
                )}
                <div className="flex-1">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-background border border-border text-foreground rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.chips && msg.chips.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {msg.chips.map((chip, ci) => (
                        <button
                          key={ci}
                          onClick={chip.action}
                          className="text-xs bg-background border border-gold/30 text-foreground hover:bg-gold/10 hover:border-gold/50 px-2.5 py-1.5 rounded-full transition-all duration-200 text-center truncate"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Main options - 2x2 grid */}
          {showMainOptions && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {MAIN_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleTreeOption(opt.label, opt.intent)}
                  className={`text-left text-[12px] sm:text-[13px] leading-snug bg-background border hover:border-gold/50 hover:bg-gold/5 rounded-xl px-3 py-3 transition-all duration-200 flex items-center gap-2 ${
                    opt.intent === "fallecimiento"
                      ? "border-destructive/30 hover:border-destructive/60 bg-destructive/5 text-destructive font-medium"
                      : "border-border"
                  }`}
                >
                  <span className="flex-1">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-gold/30 shrink-0">
                  <img src={assistantAvatar} alt="" className="w-full h-full object-cover" width={28} height={28} />
                </div>
                <div className="bg-background border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
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

        {/* Input area - always visible */}
        {showInput && (
          <div className="p-3 bg-background border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={getPlaceholder()}
                className="flex-1 bg-soft-gray border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-all duration-200"
                disabled={isLoading}
                autoFocus
              />
              <button
                onClick={toggleVoice}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isListening
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                }`}
                aria-label={isListening ? "Detener grabación" : "Enviar por voz"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputText.trim()}
                className="w-9 h-9 rounded-full bg-gold text-accent-foreground flex items-center justify-center hover:bg-gold-dark transition-all duration-200 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {mode === "ai" && contactStep === "idle" && (
              <button
                onClick={resetChat}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold mt-2 transition-all duration-200"
              >
                <ArrowLeft className="w-3 h-3" />
                Menú principal
              </button>
            )}
          </div>
        )}

        {/* Quick actions for tree mode after selection */}
        {mode === "tree" && !showMainOptions && !showInput && (
          <div className="p-3 bg-background border-t border-border shrink-0 flex gap-2">
            <a
              href="tel:+56964333760"
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-full text-xs font-medium transition-all duration-200 hover:opacity-90"
            >
              <Phone className="w-3.5 h-3.5" /> Llamar
            </a>
            <button
              onClick={resetChat}
              className="flex items-center justify-center gap-1 px-4 py-2.5 border border-border rounded-full text-xs text-muted-foreground hover:text-foreground transition-all duration-200"
            >
              <ArrowLeft className="w-3 h-3" /> Inicio
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatboxFunerario;
