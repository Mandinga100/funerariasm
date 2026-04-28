import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Hand, UserCheck, X, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import type { ConversationRow } from "./ConversationList";

export function HandoffControls({ convo }: { convo: ConversationRow }) {
  const { user, isAdmin, isCeo } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [executiveName, setExecutiveName] = useState<string>("");
  const [confirmClose, setConfirmClose] = useState(false);
  const canDeleteOnClose = isAdmin || isCeo;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setExecutiveName(data?.display_name?.trim() || user.email?.split("@")[0] || "tu ejecutivo");
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  async function takeOver() {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("chat_conversations")
      .update({ status: "humano_activo", assigned_to: user.id })
      .eq("id", convo.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const visitorFirstName = convo.visitor_name?.trim().split(/\s+/)[0];
      const visitorLabel = visitorFirstName ? ` con ${visitorFirstName}` : "";
      await supabase.from("chat_messages").insert({
        conversation_id: convo.id,
        sender_type: "system",
        content: `${executiveName} se ha unido a la conversación${visitorLabel} y le acompañará desde ahora.`,
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

  async function performClose() {
    if (!user || busy) return;
    setBusy(true);
    if (canDeleteOnClose) {
      // CEO/Admin: cerrar y eliminar inmediatamente la conversación + mensajes.
      const { error: msgErr } = await supabase
        .from("chat_messages")
        .delete()
        .eq("conversation_id", convo.id);
      if (msgErr) {
        toast({ title: "Error al eliminar mensajes", description: msgErr.message, variant: "destructive" });
        setBusy(false);
        return;
      }
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", convo.id);
      if (error) {
        toast({ title: "Error al eliminar conversación", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conversación cerrada y eliminada" });
      }
    } else {
      await supabase
        .from("chat_conversations")
        .update({ status: "cerrado", closed_at: new Date().toISOString() })
        .eq("id", convo.id);
      await supabase.from("chat_messages").insert({
        conversation_id: convo.id,
        sender_type: "system",
        content: "Conversación cerrada por el equipo.",
      });
    }
    setBusy(false);
    setConfirmClose(false);
  }

  function handleCloseClick() {
    if (canDeleteOnClose) {
      setConfirmClose(true);
    } else {
      void performClose();
    }
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
          <Button size="sm" variant="outline" onClick={handleCloseClick} disabled={busy} className="gap-1.5">
            <X className="w-3.5 h-3.5" /> Cerrar{canDeleteOnClose ? " y eliminar" : ""}
          </Button>
        </>
      )}
      {isClosed && (
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Conversación cerrada
        </span>
      )}

      <ConfirmDeleteDialog
        open={confirmClose}
        onOpenChange={(o) => !o && setConfirmClose(false)}
        onConfirm={performClose}
        loading={busy}
        title="Cerrar y eliminar conversación"
        description={`Como ${isCeo ? "CEO" : "Admin"}, al cerrar esta conversación se eliminará permanentemente junto con todos sus mensajes. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cerrar y eliminar"
      />
    </div>
  );
}
