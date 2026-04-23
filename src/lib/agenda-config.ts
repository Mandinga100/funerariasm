// Configuración central de la Agenda Funeraria
// Tipos, etiquetas, colores y opciones reutilizables.

export type AgendaStatus =
  | "programado"
  | "confirmado"
  | "en_curso"
  | "finalizado"
  | "cancelado"
  | "reprogramado";

export type AgendaEventType =
  | "velorio"
  | "ceremonia"
  | "cremacion"
  | "sepultacion"
  | "traslado"
  | "retiro"
  | "reunion"
  | "tarea"
  | "llamada"
  | "otro";

export type AgendaPriority = "baja" | "normal" | "alta" | "critica";

export interface AgendaEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: AgendaEventType;
  status: AgendaStatus;
  priority: AgendaPriority;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location_name: string | null;
  address: string | null;
  comuna: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  service_case_id: string | null;
  lead_id: string | null;
  memorial_id: string | null;
  obituary_id: string | null;
  assigned_to: string | null;
  created_by: string;
  reminder_minutes_before: number | null;
  reminded_at: string | null;
  internal_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export const STATUS_COLUMNS: { id: AgendaStatus; label: string; color: string; description: string }[] = [
  { id: "programado", label: "Programados", color: "bg-slate-500", description: "Por confirmar con la familia" },
  { id: "confirmado", label: "Confirmados", color: "bg-blue-600", description: "Listos para ejecutar" },
  { id: "en_curso", label: "En curso", color: "bg-amber-500", description: "Servicios activos en este momento" },
  { id: "finalizado", label: "Finalizados", color: "bg-emerald-600", description: "Cerrados con éxito" },
  { id: "cancelado", label: "Cancelados", color: "bg-rose-600", description: "Suspendidos o desistidos" },
];

// Orden intuitivo siguiendo el flujo natural de un servicio funerario:
// 1) Contacto inicial → 2) Coordinación → 3) Logística operativa → 4) Servicios públicos → 5) Disposición final → 6) Tareas internas.
export const EVENT_TYPES: { id: AgendaEventType; label: string; emoji: string; defaultDurationMin: number }[] = [
  // 1. Contacto y coordinación inicial
  { id: "llamada", label: "Llamada / Seguimiento", emoji: "📞", defaultDurationMin: 30 },
  { id: "reunion", label: "Reunión con familia", emoji: "🤝", defaultDurationMin: 60 },
  // 2. Logística operativa con el cuerpo
  { id: "retiro", label: "Retiro del cuerpo", emoji: "🏥", defaultDurationMin: 60 },
  { id: "traslado", label: "Traslado", emoji: "🚐", defaultDurationMin: 90 },
  // 3. Servicios funerarios públicos
  { id: "velorio", label: "Velorio", emoji: "🕯️", defaultDurationMin: 720 },
  { id: "ceremonia", label: "Ceremonia / Misa", emoji: "⛪", defaultDurationMin: 90 },
  // 4. Disposición final
  { id: "sepultacion", label: "Sepultación", emoji: "🌹", defaultDurationMin: 90 },
  { id: "cremacion", label: "Cremación", emoji: "🔥", defaultDurationMin: 120 },
  // 5. Tareas internas / otros
  { id: "tarea", label: "Tarea interna", emoji: "✅", defaultDurationMin: 30 },
  { id: "otro", label: "Otro", emoji: "📌", defaultDurationMin: 60 },
];

export const PRIORITIES: { id: AgendaPriority; label: string; className: string }[] = [
  { id: "baja", label: "Baja", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { id: "normal", label: "Normal", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { id: "alta", label: "Alta", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  { id: "critica", label: "Crítica", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
];

export const eventTypeOf = (id: string) => EVENT_TYPES.find(t => t.id === id) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
export const statusOf = (id: string) => STATUS_COLUMNS.find(s => s.id === id) ?? STATUS_COLUMNS[0];
export const priorityOf = (id: string) => PRIORITIES.find(p => p.id === id) ?? PRIORITIES[1];
