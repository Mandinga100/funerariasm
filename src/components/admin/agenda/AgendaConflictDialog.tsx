import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

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
