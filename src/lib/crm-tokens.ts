/**
 * Tokens semánticos centralizados del CRM.
 *
 * Todas las vistas administrativas (Leads, Casos, Pagos, etc.) deben consumir
 * estas constantes en lugar de declarar clases hardcodeadas. De esta forma
 * cualquier cambio cromático se propaga uniformemente y se mantiene la
 * legibilidad en modo claro y oscuro.
 *
 * Reglas:
 *  - Solo se usan tokens semánticos de Tailwind: primary, accent, destructive,
 *    secondary, muted, border, foreground.
 *  - Los fondos usan opacidad para suavizar la intensidad sin perder contraste.
 *  - Nunca se referencian colores fijos (bg-blue-500, text-amber-700, etc.).
 */

export type PipelineStageId =
  | "nuevo"
  | "contactado"
  | "cotizado"
  | "contratado"
  | "cerrado";

export interface PipelineStageToken {
  id: PipelineStageId;
  label: string;
  emoji: string;
  /** Clases para el contenedor de la columna Kanban (fondo + borde). */
  color: string;
  /** Clase para el punto indicador (badge / leyenda). */
  dotColor: string;
}

export const PIPELINE_STAGES: PipelineStageToken[] = [
  { id: "nuevo",      label: "Nuevo",      emoji: "🔵", color: "bg-primary/5 border-primary/20",  dotColor: "bg-primary" },
  { id: "contactado", label: "Contactado", emoji: "🟡", color: "bg-accent/10 border-accent/30",   dotColor: "bg-accent" },
  { id: "cotizado",   label: "Cotizado",   emoji: "🟠", color: "bg-accent/15 border-accent/40",   dotColor: "bg-accent" },
  { id: "contratado", label: "Contratado", emoji: "🟢", color: "bg-accent/20 border-accent/50",   dotColor: "bg-accent" },
  { id: "cerrado",    label: "Cerrado",    emoji: "⚫", color: "bg-muted/60 border-border",       dotColor: "bg-muted-foreground" },
];

export function getPipelineStage(id: string | null | undefined): PipelineStageToken {
  return PIPELINE_STAGES.find(s => s.id === id) ?? PIPELINE_STAGES[0];
}

/** Clases de urgencia (badge bg + text + border) por nivel. */
export const URGENCY_COLOR: Record<string, string> = {
  inmediata:   "bg-destructive/15 text-destructive border-destructive/40",
  immediate:   "bg-destructive/15 text-destructive border-destructive/40",
  alta:        "bg-destructive/10 text-destructive border-destructive/30",
  high:        "bg-destructive/10 text-destructive border-destructive/30",
  cotizacion:  "bg-primary/10 text-primary border-primary/30",
  normal:      "bg-primary/10 text-primary border-primary/30",
  baja:        "bg-muted text-muted-foreground border-border",
  low:         "bg-muted text-muted-foreground border-border",
  "previsión": "bg-accent/15 text-accent border-accent/40",
  prevision:   "bg-accent/15 text-accent border-accent/40",
};

export const URGENCY_LABELS: Record<string, string> = {
  inmediata: "Urgente",
  immediate: "Urgente",
  alta: "Alta",
  high: "Alta",
  cotizacion: "Cotización",
  normal: "Cotización",
  baja: "Baja",
  low: "Baja",
  "previsión": "Previsión",
  prevision: "Previsión",
};

/**
 * Categorías comerciales del lead — agrupan urgency en 3 buckets para pestañas CRM.
 * - urgencia: necesita servicio funerario inmediato (fallecimiento)
 * - cotizacion: interés activo frío, pidiendo precios/planes
 * - prevision: planificación a futuro, sin urgencia
 */
export type LeadCategory = "urgencia" | "cotizacion" | "prevision";

export function getLeadCategory(urgency: string | null | undefined): LeadCategory {
  if (!urgency) return "cotizacion";
  const u = urgency.toLowerCase();
  if (u === "immediate" || u === "inmediata" || u === "alta" || u === "high") return "urgencia";
  if (u === "previsión" || u === "prevision") return "prevision";
  return "cotizacion"; // normal, cotizacion, low, baja, etc → todo lo "frío activo"
}

export const LEAD_CATEGORY_META: Record<LeadCategory, { label: string; emoji: string; description: string }> = {
  urgencia:   { label: "Urgencias",   emoji: "🚨", description: "Servicios funerarios inmediatos por fallecimiento" },
  cotizacion: { label: "Cotizaciones", emoji: "💰", description: "Consultas de precios y planes activos" },
  prevision:  { label: "Previsión",   emoji: "🌿", description: "Planificación a futuro, en vida" },
};

export function getUrgencyClasses(urgency: string | null | undefined): string {
  if (!urgency) return "bg-muted text-muted-foreground border-border";
  return URGENCY_COLOR[urgency] ?? "bg-muted text-muted-foreground border-border";
}

export function getUrgencyLabel(urgency: string | null | undefined): string {
  if (!urgency) return "—";
  return URGENCY_LABELS[urgency] ?? urgency;
}

/**
 * Escala de prioridad (0-100) basada en `priority_score` de la clasificación IA.
 * Devuelve clases de fondo/texto coherentes en cualquier theme.
 */
export function getPriorityClasses(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-destructive text-destructive-foreground";
  if (score >= 60) return "bg-accent text-accent-foreground";
  if (score >= 40) return "bg-accent/70 text-accent-foreground";
  if (score >= 20) return "bg-secondary text-secondary-foreground";
  return "bg-muted text-muted-foreground";
}

/** Etiqueta cualitativa de prioridad. */
export function getPriorityLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  if (score >= 80) return "Crítica";
  if (score >= 60) return "Alta";
  if (score >= 40) return "Media";
  if (score >= 20) return "Baja";
  return "Mínima";
}

/** Estados generales de pago/caso normalizados a tokens semánticos. */
export const STATUS_COLOR: Record<string, string> = {
  pendiente:  "bg-accent/15 text-accent border-accent/40",
  pending:    "bg-accent/15 text-accent border-accent/40",
  verificado: "bg-primary/10 text-primary border-primary/30",
  verified:   "bg-primary/10 text-primary border-primary/30",
  pagado:     "bg-primary/15 text-primary border-primary/40",
  paid:       "bg-primary/15 text-primary border-primary/40",
  rechazado:  "bg-destructive/15 text-destructive border-destructive/40",
  rejected:   "bg-destructive/15 text-destructive border-destructive/40",
  cancelado:  "bg-muted text-muted-foreground border-border",
  cancelled:  "bg-muted text-muted-foreground border-border",
};

export function getStatusClasses(status: string | null | undefined): string {
  if (!status) return "bg-muted text-muted-foreground border-border";
  return STATUS_COLOR[status] ?? "bg-muted text-muted-foreground border-border";
}
