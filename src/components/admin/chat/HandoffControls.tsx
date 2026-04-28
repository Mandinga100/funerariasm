import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Hand, UserCheck, X, Lock, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import type { ConversationRow } from "./ConversationList";
import { useOnlineOperators } from "@/hooks/use-operator-presence";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function HandoffControls({ convo }: { convo: ConversationRow }) {
  const { user, isAdmin, isCeo } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [executiveName, setExecutiveName] = useState<string>("");
  const [confirmClose, setConfirmClose] = useState(false);
  const canDeleteOnClose = isAdmin || isCeo;
  const onlineOperators = useOnlineOperators();

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

  /**
   * Reasignar la conversación a otro ejecutivo que esté online.
   * - Cambia `assigned_to` y mantiene `status='humano_activo'`.
   * - Inserta un mensaje system para que el visitante vea el cambio en vivo
   *   (esto también actualiza el avatar/nombre en el chatbox vía polling).
   */
  async function reassignTo(targetUserId: string, targetName: string | null) {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("chat_conversations")
      .update({ status: "humano_activo", assigned_to: targetUserId })
      .eq("id", convo.id);
    if (error) {
      toast({ title: "Error al reasignar", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("chat_messages").insert({
        conversation_id: convo.id,
        sender_type: "system",
        content: `Conversación transferida a ${targetName ?? "otro asesor"} para continuar la atención.`,
      });
      toast({ title: "Conversación reasignada", description: `Asignada a ${targetName ?? "otro asesor"}.` });
    }
    setBusy(false);
  }

  async function performClose() {
    if (!user || busy) return;
    setBusy(true);
    if (canDeleteOnClose) {
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
  // Lista de operadores disponibles para reasignar (excluye al actualmente asignado).
  const reassignTargets = onlineOperators.filter((op) => op.user_id !== convo.assigned_to);

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy} className="gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Reasignar
                {reassignTargets.length > 0 && (
                  <span className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                    {reassignTargets.length} online
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[11px]">Ejecutivos en línea</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {reassignTargets.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground italic">
                  No hay otros ejecutivos online.
                </div>
              ) : (
                reassignTargets.map((op) => (
                  <DropdownMenuItem
                    key={op.user_id}
                    onClick={() => void reassignTo(op.user_id, op.display_name)}
                    className="gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{op.display_name ?? "Sin nombre"}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
