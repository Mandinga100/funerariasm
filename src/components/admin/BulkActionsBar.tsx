import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, FileDown, X, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  count: number;
  totalLabel?: string;
  onClear: () => void;
  onExportCSV?: () => void;
  onExportXLSX?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  /** Texto extra (p.ej. "Solo CEO puede eliminar"). */
  helperText?: string;
  extraActions?: ReactNode;
  className?: string;
}

/**
 * Barra de acciones masivas que aparece sobre la tabla cuando hay filas seleccionadas.
 * - Exportar CSV / Excel solo de las filas seleccionadas.
 * - Eliminar (oculto cuando canDelete=false).
 */
export default function BulkActionsBar({
  count,
  totalLabel = "seleccionados",
  onClear,
  onExportCSV,
  onExportXLSX,
  onDelete,
  canDelete = true,
  helperText,
  extraActions,
  className,
}: BulkActionsBarProps) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur supports-[backdrop-filter]:bg-primary/10 px-3 py-2 shadow-sm",
        className,
      )}
    >
      <span className="text-sm font-semibold text-primary tabular-nums">
        {count} {totalLabel}
      </span>
      {helperText && (
        <span className="text-xs text-muted-foreground hidden sm:inline">{helperText}</span>
      )}

      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
        {(onExportCSV || onExportXLSX) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onExportCSV && (
                <DropdownMenuItem onClick={onExportCSV}>
                  <FileText className="w-4 h-4 mr-2" /> CSV (.csv)
                </DropdownMenuItem>
              )}
              {onExportXLSX && (
                <DropdownMenuItem onClick={onExportXLSX}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel (.xlsx)
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {extraActions}

        {onDelete && canDelete && (
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar
          </Button>
        )}

        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClear} title="Limpiar selección">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
