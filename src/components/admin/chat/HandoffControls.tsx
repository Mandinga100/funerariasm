import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Hand, UserCheck, X, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ConversationRow } from "./ConversationList";

export function HandoffControls({ convo }: { convo: ConversationRow }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function takeOver() {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("chat_conversations")
      .update({ status: "humano_activo", assigned_to: user.id })
      .eq("id", convo.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      await supabase.from("chat_messages").insert({
        conversation_id: convo.id,
        sender_type: "system",
        content: "Un asesor se ha unido a la conversación.",
      });
    }
    setBusy(false);
  }

  async function release() {
    if (!user || busy) return;
    setBusy(true);
    await supabase
      .from("chat_conversations")
      .update({ status: "pendiente_humano", assigned_to: null })
      .eq("id", convo.id);
    setBusy(false);
  }

  async function close() {
    if (!user || busy) return;
    setBusy(true);
    await supabase
      .from("chat_conversations")
      .update({ status: "cerrado", closed_at: new Date().toISOString() })
      .eq("id", convo.id);
    await supabase.from("chat_messages").insert({
      conversation_id: convo.id,
      sender_type: "system",
      content: "Conversación cerrada por el equipo.",
    });
    setBusy(false);
  }

  const isMine = convo.assigned_to === user?.id;
  const isClosed = convo.status === "cerrado";

  return (
    <div className="flex flex-wrap gap-2">
      {!isMine && !isClosed && (
        <Button size="sm" onClick={takeOver} disabled={busy} className="gap-1.5">
          <Hand className="w-3.5 h-3.5" /> Tomar control
        </Button>
      )}
      {isMine && !isClosed && (
        <>
          <Button size="sm" variant="outline" onClick={release} disabled={busy} className="gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Liberar
          </Button>
          <Button size="sm" variant="outline" onClick={close} disabled={busy} className="gap-1.5">
            <X className="w-3.5 h-3.5" /> Cerrar
          </Button>
        </>
      )}
      {isClosed && (
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Conversación cerrada
        </span>
      )}
    </div>
  );
}
