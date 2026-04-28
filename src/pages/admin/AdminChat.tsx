import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConversationList, type ConversationRow } from "@/components/admin/chat/ConversationList";
import { MessageThread } from "@/components/admin/chat/MessageThread";
import { ConversationContextPanel } from "@/components/admin/chat/ConversationContextPanel";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, MessageSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MobileTab = "lista" | "hilo" | "contexto";

export default function AdminChat() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("conversation");
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [convo, setConvo] = useState<ConversationRow | null>(null);
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<MobileTab>(initialId ? "hilo" : "lista");

  // Sync when query param changes (e.g. user clicks a different deep link)
  useEffect(() => {
    const id = searchParams.get("conversation");
    if (id && id !== selectedId) {
      setSelectedId(id);
      if (isMobile) setMobileTab("hilo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load + subscribe to selected conversation
  useEffect(() => {
    if (!selectedId) { setConvo(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, conversation_token, visitor_name, visitor_phone, visitor_email, status, priority, assigned_to, unread_admin, sla_due_at, last_message_at, closed_at, lead_id, service_case_id")
        .eq("id", selectedId)
        .maybeSingle();
      if (!cancelled) setConvo(data as ConversationRow | null);
    })();
    const ch = supabase
      .channel(`chat-detail-${selectedId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_conversations", filter: `id=eq.${selectedId}` }, (payload) => {
        setConvo(payload.new as ConversationRow);
      })
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(ch); };
  }, [selectedId]);

  function handleSelect(id: string) {
    setSelectedId(id);
    if (isMobile) setMobileTab("hilo");
  }

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col -m-3 sm:-m-4">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as MobileTab)} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-3 mx-3 mt-2">
            <TabsTrigger value="lista">Bandeja</TabsTrigger>
            <TabsTrigger value="hilo" disabled={!selectedId}>Hilo</TabsTrigger>
            <TabsTrigger value="contexto" disabled={!selectedId}>Detalle</TabsTrigger>
          </TabsList>
          <div className="flex-1 mt-2 overflow-hidden">
            {mobileTab === "lista" && (
              <ConversationList selectedId={selectedId} onSelect={handleSelect} />
            )}
            {mobileTab === "hilo" && selectedId && (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobileTab("lista")}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <p className="font-medium text-sm truncate flex-1">
                    {convo?.visitor_name ?? convo?.visitor_phone ?? "Visitante"}
                  </p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobileTab("contexto")}>
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <MessageThread conversationId={selectedId} />
                </div>
              </div>
            )}
            {mobileTab === "contexto" && convo && (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobileTab("hilo")}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <p className="font-medium text-sm flex-1">Contexto</p>
                </div>
                <ConversationContextPanel convo={convo} />
              </div>
            )}
          </div>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="h-screen md:h-screen flex border-l bg-background overflow-hidden">
      <div className="w-[300px] xl:w-[340px] border-r flex-shrink-0">
        <ConversationList selectedId={selectedId} onSelect={handleSelect} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {selectedId && convo ? (
          <>
            <div className="px-4 py-2.5 border-b bg-background">
              <h2 className="text-sm font-semibold truncate">
                {convo.visitor_name ?? convo.visitor_phone ?? convo.visitor_email ?? "Visitante anónimo"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {convo.visitor_phone && `📞 ${convo.visitor_phone}`}
                {convo.visitor_phone && convo.visitor_email && " · "}
                {convo.visitor_email && `✉️ ${convo.visitor_email}`}
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <MessageThread conversationId={selectedId} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3">
            <MessageSquare className="w-12 h-12 opacity-30" />
            <p className="text-sm">Selecciona una conversación para empezar</p>
          </div>
        )}
      </div>
      {selectedId && convo && (
        <div className="w-[300px] xl:w-[340px] border-l flex-shrink-0 bg-muted/10">
          <ConversationContextPanel convo={convo} />
        </div>
      )}
    </div>
  );
}
