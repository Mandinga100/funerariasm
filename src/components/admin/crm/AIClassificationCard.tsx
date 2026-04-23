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
  _source?: "ai" | "heuristic";
}

const urgencyMap: Record<string, { label: string; emoji: string; color: string }> = {
  immediate: { label: "Atención inmediata", emoji: "❗", color: "bg-black text-white border-black hover:bg-black hover:text-white" },
  inmediata: { label: "Atención inmediata", emoji: "❗", color: "bg-black text-white border-black hover:bg-black hover:text-white" },
  normal: { label: "Prioridad normal", emoji: "🔵", color: "bg-blue-700 text-white border-blue-700 hover:bg-blue-700 hover:text-white" },
  "previsión": { label: "Planificación futura", emoji: "🌿", color: "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-700 hover:text-white" },
  prevision: { label: "Planificación futura", emoji: "🌿", color: "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-700 hover:text-white" },
  alta: { label: "Prioridad alta", emoji: "🔴", color: "bg-red-700 text-white border-red-700 hover:bg-red-700 hover:text-white" },
  high: { label: "Prioridad alta", emoji: "🔴", color: "bg-red-700 text-white border-red-700 hover:bg-red-700 hover:text-white" },
  baja: { label: "Prioridad baja", emoji: "🟢", color: "bg-green-700 text-white border-green-700 hover:bg-green-700 hover:text-white" },
  low: { label: "Prioridad baja", emoji: "🟢", color: "bg-green-700 text-white border-green-700 hover:bg-green-700 hover:text-white" },
};

const intentMap: Record<string, { label: string; emoji: string }> = {
  servicio_funerario_urgente: { label: "Servicio funerario urgente", emoji: "⚡" },
  servicio_funerario: { label: "Servicio funerario", emoji: "🕊️" },
  traslado: { label: "Traslado de restos", emoji: "🚐" },
  cremacion: { label: "Cremación", emoji: "🕯️" },
  cotizacion: { label: "Cotización de servicios", emoji: "💰" },
  prevision_funeraria: { label: "Previsión funeraria", emoji: "📋" },
  memorial_legado: { label: "Memorial / Legado Eterno", emoji: "🕊️" },
  consulta_general: { label: "Consulta general", emoji: "💬" },
  reclamo: { label: "Reclamo o queja", emoji: "⚠️" },
};

// Map plan identifiers to their display names
const planDisplayNames: Record<string, string> = {
  margarita: "Plan Margarita",
  "plan margarita": "Plan Margarita",
  "plan_margarita": "Plan Margarita",
  azucena: "Plan Azucena",
  "plan azucena": "Plan Azucena",
  "plan_azucena": "Plan Azucena",
  acacia: "Plan Acacia",
  "plan acacia": "Plan Acacia",
  "plan_acacia": "Plan Acacia",
  orquidea: "Plan Orquídea",
  "plan orquidea": "Plan Orquídea",
  "plan orquídea": "Plan Orquídea",
  "plan_orquidea": "Plan Orquídea",
  jazmin: "Plan Jazmín",
  "plan jazmin": "Plan Jazmín",
  "plan jazmín": "Plan Jazmín",
  "plan_jazmin": "Plan Jazmín",
  castano: "Plan Castaño",
  "plan castano": "Plan Castaño",
  "plan castaño": "Plan Castaño",
  "plan_castano": "Plan Castaño",
  rauli: "Plan Raulí",
  "plan rauli": "Plan Raulí",
  "plan raulí": "Plan Raulí",
  "plan_rauli": "Plan Raulí",
};

function resolvePlanName(raw?: string | null): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return planDisplayNames[key] ?? raw;
}

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
  const urgency = urgencyMap[c.suggested_urgency ?? ""] ?? { label: c.suggested_urgency, emoji: "❓", color: "bg-gray-700 text-white border-gray-700 hover:bg-gray-700 hover:text-white" };
  const intent = intentMap[c.intent ?? ""] ?? { label: c.intent, emoji: "❓" };
  const channel = channelMap[c.recommended_channel ?? ""];
  const emotional = emotionalMap[c.emotional_context ?? ""];
  const resolvedPlan = resolvePlanName(planName);

  const isHeuristic = c._source === "heuristic";

  return (
    <div className="rounded-lg border border-violet-300 dark:border-violet-700/60 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/40 dark:to-background overflow-hidden">
      {/* Header — urgency + score */}
      <div className="px-3 py-2.5 border-b border-violet-200 dark:border-violet-800/60 flex items-center justify-between gap-2 bg-violet-50/60 dark:bg-violet-950/30">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={cn("text-xs font-semibold border", urgency.color)}>
            {urgency.emoji} {urgency.label}
          </Badge>
          {isHeuristic && (
            <Badge variant="outline" className="text-[9px] font-medium border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30">
              🧠 Heurístico
            </Badge>
          )}
        </div>
        <div className="w-28">
          <ScoreBadge score={c.priority_score ?? 0} />
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Plan — highlighted first when available */}
        {resolvedPlan && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 rounded-md p-2.5 border border-amber-200 dark:border-amber-800/70">
            <span className="text-lg leading-none mt-0.5">🌟</span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300 font-semibold">Plan contratado</p>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{resolvedPlan}</p>
            </div>
          </div>
        )}

        {/* Service / Intent */}
        <div className="flex items-start gap-2">
          <span className="text-lg leading-none mt-0.5">{intent.emoji}</span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo de servicio</p>
            <p className="text-sm font-semibold text-foreground">{intent.label}</p>
          </div>
        </div>

        {/* Summary */}
        {c.summary && (
          <div className="bg-card dark:bg-background/60 rounded-md p-2.5 border border-violet-200 dark:border-violet-800/50">
            <p className="text-xs leading-relaxed text-foreground">{c.summary}</p>
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
            <InfoChip emoji="⏱️" label="Tiempo máx. de respuesta" value={`${c.sla_hours}h`} />
          )}
        </div>

        {/* Next step */}
        {c.next_step && (
          <div className="bg-primary/10 dark:bg-primary/15 rounded-md p-2.5 border border-primary/20 dark:border-primary/30">
            <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-0.5">📋 Próximo paso</p>
            <p className="text-xs font-medium text-foreground">{c.next_step}</p>
          </div>
        )}

        {/* Tags */}
        {c.tags && c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] font-normal text-foreground border-border">
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
    <div className="flex items-start gap-1.5 bg-muted dark:bg-muted/60 rounded-md px-2 py-1.5 border border-border/50">
      <span className="text-sm leading-none mt-0.5">{emoji}</span>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-[11px] font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
