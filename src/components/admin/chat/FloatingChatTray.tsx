import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageCircle, X, Send, ExternalLink, Volume2, VolumeX } from "lucide-react";

/**
 * Bandeja flotante estilo WhatsApp.
 * - Muestra burbuja inferior derecha con badge de mensajes sin leer (en tiempo real).
 * - Lista las conversaciones activas (bot, pendiente_humano, humano_activo).
 * - Permite responder rápido o saltar a /admin/chat para gestión completa.
 * - Sonido + toast cuando entra un mensaje nuevo o llega solicitud de asesor.
 */

interface ConvoLite {
  id: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  visitor_email: string | null;
  status: "bot" | "pendiente_humano" | "humano_activo" | "cerrado";
  priority: "baja" | "normal" | "alta" | "urgente";
  unread_admin: number;
  last_message_at: string;
  last_message_preview?: string | null;
}

const statusBadge: Record<ConvoLite["status"], { label: string; cls: string }> = {
  bot: { label: "Bot", cls: "bg-muted text-muted-foreground" },
  pendiente_humano: { label: "Esperando", cls: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200" },
  humano_activo: { label: "Activa", cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200" },
  cerrado: { label: "Cerrada", cls: "bg-muted text-muted-foreground" },
};

export default function FloatingChatTray() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { playNotification, playUrgentAlert } = useNotificationSound();

  const [convos, setConvos] = useState<ConvoLite[]>([]);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("chat_tray_muted") === "true";
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const initialLoadRef = useRef(true);

  // Oculta la bandeja flotante mientras estamos dentro del módulo /admin/chat.
  const hideOnChatPage = location.pathname.startsWith("/admin/chat");

  // Carga inicial + realtime de conversaciones activas.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, visitor_name, visitor_phone, visitor_email, status, priority, unread_admin, last_message_at")
        .in("status", ["bot", "pendiente_humano", "humano_activo"])
        .order("last_message_at", { ascending: false })
        .limit(15);
      if (!cancelled) {
        setConvos((data ?? []) as ConvoLite[]);
        initialLoadRef.current = false;
      }
    })();

    const ch = supabase
      .channel("floating-tray-convos")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, (payload) => {
        setConvos((prev) => {
          if (payload.eventType === "DELETE") {
            return prev.filter((c) => c.id !== (payload.old as { id: string }).id);
          }
          const next = payload.new as ConvoLite;
          const isActive = ["bot", "pendiente_humano", "humano_activo"].includes(next.status);
          if (!isActive) return prev.filter((c) => c.id !== next.id);
          const exists = prev.find((c) => c.id === next.id);
          const updated = exists
            ? prev.map((c) => (c.id === next.id ? { ...c, ...next } : c))
            : [next, ...prev];
          return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()).slice(0, 15);
        });
      })
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(ch); };
  }, [user?.id]);

  // Realtime de mensajes nuevos: incrementa preview + suena alerta.
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("floating-tray-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as { conversation_id: string; sender_type: string; content: string; is_internal_note: boolean };
        if (msg.sender_type !== "visitor" || msg.is_internal_note) return;

        setConvos((prev) =>
          prev.map((c) =>
            c.id === msg.conversation_id
              ? { ...c, last_message_preview: msg.content, last_message_at: new Date().toISOString() }
              : c,
          ),
        );

        if (initialLoadRef.current || muted) return;
        const target = convos.find((c) => c.id === msg.conversation_id);
        if (target?.priority === "urgente" || target?.priority === "alta") {
          playUrgentAlert();
        } else {
          playNotification();
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id, muted, convos, playNotification, playUrgentAlert]);

  const totalUnread = useMemo(
    () => convos.reduce((acc, c) => acc + (c.unread_admin || 0), 0),
    [convos],
  );
  const hasPending = useMemo(
    () => convos.some((c) => c.status === "pendiente_humano"),
    [convos],
  );

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("chat_tray_muted", String(next));
  }

  async function quickSend() {
    if (!draft.trim() || !user || !activeId || sending) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: activeId,
      sender_type: "admin",
      sender_user_id: user.id,
      content: draft.trim(),
      is_internal_note: false,
    });
    if (!error) {
      await supabase
        .from("chat_conversations")
        .update({ status: "humano_activo", assigned_to: user.id })
        .eq("id", activeId);
      setDraft("");
    }
    setSending(false);
  }

  function openInPanel(id: string) {
    setOpen(false);
    navigate(`/admin/chat?conversation=${id}`);
  }

  if (!user || hideOnChatPage) return null;

  return (
    <>
      {/* Burbuja flotante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Bandeja de chat"
        className={cn(
          "fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all",
          "bg-[#25D366] hover:bg-[#20BD5A] text-white",
          hasPending && "ring-4 ring-amber-400/60 animate-pulse",
        )}
      >
        <MessageCircle className="w-7 h-7" strokeWidth={2.2} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-background">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Panel flotante */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <div>
                <p className="text-sm font-semibold leading-tight">Bandeja Chat</p>
                <p className="text-[10px] opacity-80 leading-tight">
                  {convos.length} {convos.length === 1 ? "conversación activa" : "conversaciones activas"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                title={muted ? "Activar sonido" : "Silenciar alertas"}
                className="p-1.5 rounded hover:bg-white/10 transition"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/chat")}
                title="Abrir Bandeja Chat completa"
                className="p-1.5 rounded hover:bg-white/10 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-white/10 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lista de conversaciones o vista de chat seleccionado */}
          {!activeId ? (
            <div className="flex-1 overflow-y-auto bg-[#ECE5DD] dark:bg-muted/20">
              {convos.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Sin conversaciones activas
                </div>
              ) : (
                convos.map((c) => {
                  const name = c.visitor_name ?? c.visitor_phone ?? c.visitor_email ?? "Visitante";
                  const initial = name.slice(0, 1).toUpperCase();
                  const sb = statusBadge[c.status];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className="w-full px-3 py-2.5 flex items-center gap-2.5 border-b border-black/5 hover:bg-white/40 dark:hover:bg-background/40 transition text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#25D366] text-white font-semibold text-sm flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate text-foreground">{name}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(c.last_message_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0 h-4", sb.cls)}>
                            {sb.label}
                          </Badge>
                          {c.priority === "urgente" && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 animate-pulse">URGENTE</Badge>
                          )}
                          {c.unread_admin > 0 && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">{c.unread_admin}</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <QuickChatView
              convoId={activeId}
              onBack={() => { setActiveId(null); setDraft(""); }}
              onOpenFull={() => openInPanel(activeId)}
              draft={draft}
              setDraft={setDraft}
              onSend={quickSend}
              sending={sending}
              convo={convos.find((c) => c.id === activeId)}
            />
          )}
        </div>
      )}
    </>
  );
}

function QuickChatView({
  convoId,
  onBack,
  onOpenFull,
  draft,
  setDraft,
  onSend,
  sending,
  convo,
}: {
  convoId: string;
  onBack: () => void;
  onOpenFull: () => void;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  convo?: ConvoLite;
}) {
  const [messages, setMessages] = useState<Array<{ id: string; sender_type: string; content: string; created_at: string; is_internal_note: boolean }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, sender_type, content, created_at, is_internal_note")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true })
        .limit(30);
      if (!cancelled) setMessages(data ?? []);
    })();
    const ch = supabase
      .channel(`tray-msgs-${convoId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${convoId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as typeof messages[number]]);
      })
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(ch); };
  }, [convoId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const name = convo?.visitor_name ?? convo?.visitor_phone ?? "Visitante";

  return (
    <>
      <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">←</button>
        <p className="text-sm font-medium flex-1 truncate">{name}</p>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={onOpenFull}>
          <ExternalLink className="w-3 h-3" /> Bandeja
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-[#ECE5DD] dark:bg-muted/20 min-h-[180px] max-h-[280px]">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground pt-6">Sin mensajes aún</p>
        ) : (
          messages.filter((m) => !m.is_internal_note).map((m) => {
            const mine = m.sender_type === "admin" || m.sender_type === "bot";
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-lg px-2.5 py-1.5 text-[12px] leading-snug shadow-sm",
                  mine ? "bg-[#DCF8C6] dark:bg-emerald-900/40 text-foreground" : "bg-white dark:bg-background text-foreground",
                )}>
                  {m.content}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t p-2 flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Respuesta rápida…"
          className="h-9 text-sm"
        />
        <Button size="icon" onClick={onSend} disabled={!draft.trim() || sending} className="h-9 w-9 bg-[#25D366] hover:bg-[#20BD5A]">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}
