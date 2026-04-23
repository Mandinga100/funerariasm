import { supabase } from "@/integrations/supabase/client";

/**
 * Busca el primer bloque libre para un responsable, comenzando en `from`,
 * con duración `durationMin` minutos, respetando horario laboral
 * (workStartHour..workEndHour) y avanzando en pasos de `stepMin` minutos.
 * Limita búsqueda a `maxDays` días hacia adelante.
 */
export async function findNextAvailableSlot(params: {
  userId: string;
  durationMin: number;
  from?: Date;
  excludeEventId?: string | null;
  workStartHour?: number;
  workEndHour?: number;
  stepMin?: number;
  maxDays?: number;
}): Promise<{ start: Date; end: Date } | null> {
  const {
    userId,
    durationMin,
    from = new Date(),
    excludeEventId = null,
    workStartHour = 8,
    workEndHour = 22,
    stepMin = 15,
    maxDays = 14,
  } = params;

  const horizon = new Date(from.getTime() + maxDays * 86_400_000);

  // Cargar todos los eventos activos del responsable en la ventana de búsqueda
  const { data, error } = await supabase
    .from("agenda_events")
    .select("id, start_at, end_at, status")
    .eq("assigned_to", userId)
    .lte("start_at", horizon.toISOString())
    .gte("end_at", from.toISOString())
    .not("status", "in", "(cancelado,finalizado)")
    .order("start_at", { ascending: true });

  if (error) return null;

  const busy = (data ?? [])
    .filter((e) => e.id !== excludeEventId)
    .map((e) => ({ start: new Date(e.start_at), end: new Date(e.end_at) }));

  // Redondear `from` al próximo step
  const startSearch = new Date(from);
  startSearch.setSeconds(0, 0);
  const minutes = startSearch.getMinutes();
  const remainder = minutes % stepMin;
  if (remainder !== 0) startSearch.setMinutes(minutes + (stepMin - remainder));

  // Si está fuera de horario laboral, mover al inicio del próximo día laboral
  const moveToWorkWindow = (d: Date): Date => {
    const out = new Date(d);
    const h = out.getHours();
    if (h < workStartHour) {
      out.setHours(workStartHour, 0, 0, 0);
    } else if (h >= workEndHour) {
      out.setDate(out.getDate() + 1);
      out.setHours(workStartHour, 0, 0, 0);
    }
    return out;
  };

  let cursor = moveToWorkWindow(startSearch);
  const maxIterations = (maxDays * 24 * 60) / stepMin;

  for (let i = 0; i < maxIterations; i++) {
    if (cursor >= horizon) return null;

    const candidateStart = cursor;
    const candidateEnd = new Date(cursor.getTime() + durationMin * 60_000);

    // El bloque entero debe caber dentro del horario laboral del mismo día
    const endHourLimit = new Date(candidateStart);
    endHourLimit.setHours(workEndHour, 0, 0, 0);
    if (candidateEnd > endHourLimit) {
      // Saltar al próximo día laboral
      const next = new Date(candidateStart);
      next.setDate(next.getDate() + 1);
      next.setHours(workStartHour, 0, 0, 0);
      cursor = next;
      continue;
    }

    // ¿Hay overlap con algún evento ocupado?
    const overlap = busy.some(
      (b) => candidateStart < b.end && candidateEnd > b.start
    );

    if (!overlap) {
      return { start: candidateStart, end: candidateEnd };
    }

    cursor = new Date(cursor.getTime() + stepMin * 60_000);
    cursor = moveToWorkWindow(cursor);
  }

  return null;
}

export const formatSlot = (start: Date, end: Date): string => {
  const dateFmt = start.toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const startFmt = start.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endFmt = end.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateFmt} · ${startFmt} – ${endFmt}`;
};
