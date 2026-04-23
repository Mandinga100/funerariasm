import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarClock, Loader2, Sparkles } from "lucide-react";
import { findNextAvailableSlot, formatSlot } from "@/lib/agenda-availability";

export interface ConflictItem {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conflicts: ConflictItem[];
  assigneeName?: string | null;
  context?: "drag" | "save";
  onConfirm: () => void;
  onCancel?: () => void;

  // Sugerencia automática de horario disponible
  assigneeId?: string | null;
  durationMin?: number;
  excludeEventId?: string | null;
  searchFrom?: Date;
  onReschedule?: (start: Date, end: Date) => void | Promise<void>;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });

export default function AgendaConflictDialog({
  open,
  onOpenChange,
  conflicts,
  assigneeName,
  context = "save",
  onConfirm,
  onCancel,
  assigneeId,
  durationMin,
  excludeEventId,
  searchFrom,
  onReschedule,
}: Props) {
  const count = conflicts.length;
  const title =
    context === "drag"
      ? "Conflicto de horario al reprogramar"
      : "Conflicto de horario detectado";

  const intro =
    context === "drag"
      ? `Al mover este evento, el responsable${assigneeName ? ` (${assigneeName})` : ""} quedará con ${count} evento${count !== 1 ? "s" : ""} superpuesto${count !== 1 ? "s" : ""}.`
      : `El responsable${assigneeName ? ` (${assigneeName})` : ""} ya tiene ${count} evento${count !== 1 ? "s" : ""} en este horario.`;

  // Sugerencia
  const canSuggest = !!assigneeId && !!durationMin && !!onReschedule;
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState<{ start: Date; end: Date } | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (!open || !canSuggest) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    setLoadingSuggestion(true);
    setSuggestion(null);
    findNextAvailableSlot({
      userId: assigneeId!,
      durationMin: durationMin!,
      from: searchFrom ?? new Date(),
      excludeEventId: excludeEventId ?? null,
    })
      .then((slot) => {
        if (!cancelled) setSuggestion(slot);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, canSuggest, assigneeId, durationMin, excludeEventId, searchFrom]);

  const handleReschedule = async () => {
    if (!suggestion || !onReschedule) return;
    setRescheduling(true);
    try {
      await onReschedule(suggestion.start, suggestion.end);
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{intro}</p>
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1.5">
                  Eventos en conflicto:
                </p>
                <ul className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                  {conflicts.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex flex-col">
                      <span className="font-medium">• {c.title}</span>
                      <span className="text-amber-800/80 dark:text-amber-300/80 pl-3">
                        {fmt(c.start_at)} — {fmt(c.end_at)}
                      </span>
                    </li>
                  ))}
                  {conflicts.length > 5 && (
                    <li className="pl-3 italic">…y {conflicts.length - 5} más</li>
                  )}
                </ul>
              </div>

              {/* Sugerencia inteligente */}
              {canSuggest && (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3">
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Sugerencia inteligente
                  </p>
                  {loadingSuggestion ? (
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Buscando primer horario disponible…
                    </p>
                  ) : suggestion ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-xs text-emerald-900 dark:text-emerald-200">
                        <p className="flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span className="font-medium">{formatSlot(suggestion.start, suggestion.end)}</span>
                        </p>
                        <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                          Primer hueco libre del responsable en horario laboral (08:00–22:00).
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleReschedule}
                        disabled={rescheduling}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      >
                        {rescheduling ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Reprogramando…</>
                        ) : (
                          <><CalendarClock className="w-3.5 h-3.5 mr-1" />Reprogramar aquí</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      No se encontró un hueco libre en los próximos 14 días dentro del horario laboral.
                      Considera reasignar a otro responsable.
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Para evitar dobles compromisos, te recomendamos reasignar o reprogramar antes de continuar.
                Si estás seguro, confirma para forzar el cambio.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Confirmar de todas formas
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
