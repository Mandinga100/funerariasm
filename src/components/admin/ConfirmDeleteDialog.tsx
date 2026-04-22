import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  count?: number;
  itemLabel?: { singular: string; plural: string };
  confirmLabel?: string;
  loading?: boolean;
}

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  count,
  itemLabel = { singular: "registro", plural: "registros" },
  confirmLabel,
  loading = false,
}: ConfirmDeleteDialogProps) {
  const word = count === 1 ? itemLabel.singular : itemLabel.plural;
  const finalTitle =
    title ?? (count != null ? `Eliminar ${count} ${word}` : "Eliminar registro");
  const finalDescription =
    description ??
    `Esta acción no se puede deshacer. Se eliminarán permanentemente ${count ?? "los"} ${word} seleccionados.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            {finalTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>{finalDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Eliminando..." : confirmLabel ?? `Sí, eliminar`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
