import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageBubble, type ChatMessageRow } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { Send, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  conversationId: string;
  /** When true, hides the composer (used inside read-only tabs in lead/case sheets). */
  readOnly?: boolean;
}

export function MessageThread({ conversationId, readOnly = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load messages + subscribe
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setMessages((data ?? []) as ChatMessageRow[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`chat-thread-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessageRow]);
        }
      )
      .subscribe();

    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [conversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Mark visitor messages as read by admin
  useEffect(() => {
    if (readOnly || !user) return;
    const unread = messages.filter((m) => m.sender_type === "visitor" && !m.read_by_admin_at).map((m) => m.id);
    if (unread.length === 0) return;
    void supabase
      .from("chat_messages")
      .update({ read_by_admin_at: new Date().toISOString() })
      .in("id", unread);
    // Reset counter on conversation
    void supabase
      .from("chat_conversations")
      .update({ unread_admin: 0 })
      .eq("id", conversationId);
  }, [messages, conversationId, readOnly, user]);

  async function handleSend() {
    if (!draft.trim() || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "admin",
      sender_user_id: user.id,
      content: draft.trim(),
      is_internal_note: internalNote,
    });
    if (error) {
      toast({ title: "Error al enviar", description: error.message, variant: "destructive" });
    } else {
      setDraft("");
      // Si era mensaje al visitante (no nota), aseguramos status humano_activo
      if (!internalNote) {
        await supabase
          .from("chat_conversations")
          .update({ status: "humano_activo", assigned_to: user.id })
          .eq("id", conversationId);
      }
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 bg-muted/30">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Cargando mensajes…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Sin mensajes todavía
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} msg={m} />)
        )}
      </div>

      {!readOnly && (
        <div className="border-t bg-background p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInternalNote((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border transition-colors",
                internalNote
                  ? "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 text-yellow-900 dark:text-yellow-100"
                  : "border-input text-muted-foreground hover:bg-muted"
              )}
            >
              <StickyNote className="w-3 h-3" />
              {internalNote ? "Nota interna activa" : "Mensaje al visitante"}
            </button>
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={internalNote ? "Nota visible solo para el equipo…" : "Responder al visitante…"}
              rows={2}
              className="resize-none text-sm"
            />
            <Button onClick={() => void handleSend()} disabled={!draft.trim() || sending} size="icon" className="shrink-0 h-10 w-10">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
