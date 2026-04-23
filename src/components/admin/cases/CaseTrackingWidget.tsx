import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Send, Copy, Check, Users, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Tracking {
  id: string;
  family_code: string;
  family_name: string;
  family_phone: string | null;
  family_email: string | null;
  family_phone_normalized: string | null;
  is_published: boolean;
  published_at: string | null;
  status: string;
  auto_created_from: string | null;
}

interface Props { caseId: string; }

export default function CaseTrackingWidget({ caseId }: Props) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("family_tracking")
      .select("id, family_code, family_name, family_phone, family_email, family_phone_normalized, is_published, published_at, status, auto_created_from")
      .eq("service_case_id", caseId)
      .maybeSingle();
    setTracking((data as Tracking | null) ?? null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [caseId]);

  const togglePublished = async (next: boolean) => {
    if (!tracking) return;
    setBusy(true);
    const { error } = await supabase
      .from("family_tracking")
      .update({ is_published: next, published_at: next ? new Date().toISOString() : tracking.published_at })
      .eq("id", tracking.id);
    setBusy(false);
    if (error) { toast.error("No se pudo actualizar la visibilidad", { description: error.message }); return; }
    toast.success(next ? "👪 Tracking visible para la familia" : "🔒 Tracking marcado como privado");
    setTracking({ ...tracking, is_published: next });
  };

  const sendAccess = async () => {
    if (!tracking) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("notify-family-tracking", {
      body: { tracking_id: tracking.id, channel: "all" },
    });
    setBusy(false);
    if (error) { toast.error("No se pudo enviar el acceso", { description: error.message }); return; }
    const channels = (data?.sent_channels ?? []) as string[];
    if (data?.whatsapp_url) {
      // Abrimos WhatsApp del ejecutivo con el mensaje precargado a la familia
      window.open(data.whatsapp_url, "_blank", "noopener");
    }
    toast.success("Acceso enviado a la familia", {
      description: channels.length > 0 ? `Canales: ${channels.join(", ")}` : "Sin canales contactables",
    });
  };

  const copyCode = async () => {
    if (!tracking) return;
    await navigator.clipboard.writeText(tracking.family_code);
    setCopied(true);
    toast.success("Código copiado");
    setTimeout(() => setCopied(false), 1800);
  };

  const openPublic = () => {
    if (!tracking) return;
    window.open(`/seguimiento?code=${encodeURIComponent(tracking.family_code)}`, "_blank", "noopener");
  };

  if (loading) {
    return <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Cargando tracking familiar…</div>;
  }

  if (!tracking) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Users className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-foreground">Sin tracking familiar</p>
          <p>Se creará automáticamente cuando un evento del caso pase a <strong>En curso</strong> en la agenda y el caso esté completo + marcado como urgente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Tracking familiar</span>
            <Badge variant={tracking.is_published ? "default" : "secondary"} className="text-[10px]">
              {tracking.is_published ? <><Eye className="w-3 h-3 mr-1" />Visible</> : <><EyeOff className="w-3 h-3 mr-1" />Privado</>}
            </Badge>
            {tracking.auto_created_from && (
              <Badge variant="outline" className="text-[10px]">auto</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{tracking.family_name}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{tracking.is_published ? "Público" : "Privado"}</span>
          <Switch checked={tracking.is_published} onCheckedChange={togglePublished} disabled={busy} />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Código</span>
        <code className="text-xs font-mono font-semibold tracking-widest">{tracking.family_code}</code>
        <Button size="sm" variant="ghost" className="ml-auto h-6 w-6 p-0" onClick={copyCode}>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={openPublic} title="Ver vista pública">
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={sendAccess} disabled={busy || !tracking.is_published}>
          <Send className="w-3 h-3 mr-1" />Enviar acceso a la familia
        </Button>
      </div>

      {!tracking.is_published && (
        <p className="text-[11px] text-muted-foreground">
          Activa la visibilidad para que la familia pueda consultar el avance con su código en /seguimiento.
        </p>
      )}
    </div>
  );
}
