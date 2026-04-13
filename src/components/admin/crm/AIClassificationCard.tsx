import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Classification {
  summary?: string;
  suggested_urgency?: string;
  intent?: string;
  priority_score?: number;
  next_step?: string;
  recommended_channel?: string;
  emotional_context?: string;
  estimated_value?: number;
  sla_hours?: number;
  tags?: string[];
}

const urgencyMap: Record<string, { label: string; emoji: string; color: string }> = {
  immediate: { label: "Atención inmediata", emoji: "❗", color: "bg-black text-white border-black hover:bg-black" },
  inmediata: { label: "Atención inmediata", emoji: "❗", color: "bg-black text-white border-black hover:bg-black" },
  normal: { label: "Prioridad normal", emoji: "🔵", color: "bg-blue-100 text-blue-800 border-blue-300" },
  "previsión": { label: "Planificación futura", emoji: "🌿", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  prevision: { label: "Planificación futura", emoji: "🌿", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

const intentMap: Record<string, { label: string; emoji: string }> = {
  servicio_funerario_urgente: { label: "Servicio funerario urgente", emoji: "⚡" },
  traslado: { label: "Traslado de restos", emoji: "🚐" },
  cremacion: { label: "Cremación", emoji: "🕯️" },
  cotizacion: { label: "Cotización de servicios", emoji: "💰" },
  prevision_funeraria: { label: "Previsión funeraria", emoji: "📋" },
  memorial_legado: { label: "Memorial / Legado Eterno", emoji: "🕊️" },
  consulta_general: { label: "Consulta general", emoji: "💬" },
  reclamo: { label: "Reclamo o queja", emoji: "⚠️" },
};

const channelMap: Record<string, { label: string; emoji: string }> = {
  llamada_telefonica: { label: "Llamada telefónica", emoji: "📞" },
  whatsapp: { label: "WhatsApp", emoji: "💬" },
  email: { label: "Correo electrónico", emoji: "📧" },
  visita_presencial: { label: "Visita presencial", emoji: "🏠" },
};

const emotionalMap: Record<string, { label: string; emoji: string }> = {
  duelo_activo: { label: "Duelo activo", emoji: "🕊️" },
  planificacion_tranquila: { label: "Planificación tranquila", emoji: "🌿" },
  urgencia_familiar: { label: "Urgencia familiar", emoji: "⚡" },
  consulta_informativa: { label: "Consulta informativa", emoji: "ℹ️" },
  insatisfaccion: { label: "Insatisfacción", emoji: "⚠️" },
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-red-500" : score >= 60 ? "bg-orange-500" : score >= 40 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums">{score}/100</span>
    </div>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

interface Props {
  classification: Classification;
  planName?: string | null;
}

export default function AIClassificationCard({ classification: c, planName }: Props) {
  const urgency = urgencyMap[c.suggested_urgency ?? ""] ?? { label: c.suggested_urgency, emoji: "❓", color: "bg-muted" };
  const intent = intentMap[c.intent ?? ""] ?? { label: c.intent, emoji: "❓" };
  const channel = channelMap[c.recommended_channel ?? ""];
  const emotional = emotionalMap[c.emotional_context ?? ""];

  return (
    <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-white overflow-hidden">
      {/* Header — urgency + score */}
      <div className="px-3 py-2.5 border-b border-violet-100 flex items-center justify-between gap-2">
        <Badge className={cn("text-xs font-semibold border", urgency.color)}>
          {urgency.emoji} {urgency.label}
        </Badge>
        <div className="w-28">
          <ScoreBadge score={c.priority_score ?? 0} />
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Service / Intent */}
        <div className="flex items-start gap-2">
          <span className="text-lg leading-none mt-0.5">{intent.emoji}</span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Servicio detectado</p>
            <p className="text-sm font-semibold text-foreground">{intent.label}</p>
            {planName && (
              <Badge variant="secondary" className="mt-1 text-xs bg-amber-100 text-amber-800 border border-amber-300">
                🌟 {planName}
              </Badge>
            )}
          </div>
        </div>

        {/* Summary */}
        {c.summary && (
          <div className="bg-white/80 rounded-md p-2.5 border border-violet-100">
            <p className="text-xs leading-relaxed text-foreground/90">{c.summary}</p>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2">
          {emotional && (
            <InfoChip emoji={emotional.emoji} label="Contexto" value={emotional.label} />
          )}
          {channel && (
            <InfoChip emoji={channel.emoji} label="Contactar vía" value={channel.label} />
          )}
          {(c.estimated_value ?? 0) > 0 && (
            <InfoChip emoji="💎" label="Valor estimado" value={fmt(c.estimated_value!)} />
          )}
          {c.sla_hours != null && (
            <InfoChip emoji="⏱️" label="SLA máximo" value={`${c.sla_hours}h`} />
          )}
        </div>

        {/* Next step */}
        {c.next_step && (
          <div className="bg-primary/5 rounded-md p-2.5 border border-primary/10">
            <p className="text-[10px] uppercase tracking-wider text-primary/70 font-medium mb-0.5">📋 Próximo paso</p>
            <p className="text-xs font-medium text-foreground">{c.next_step}</p>
          </div>
        )}

        {/* Tags */}
        {c.tags && c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoChip({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5 bg-muted/40 rounded-md px-2 py-1.5">
      <span className="text-sm leading-none mt-0.5">{emoji}</span>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-[11px] font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
