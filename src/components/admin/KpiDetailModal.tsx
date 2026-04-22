import { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, FileSpreadsheet, FileText, Inbox } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface KpiDetailColumn<T> {
  key: string;
  label: string;
  className?: string;
  cell: (row: T) => ReactNode;
  /** Si está, usa accessor para export en lugar de cell. */
  exportAccessor?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
}

interface KpiDetailModalProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  rows: T[];
  rowKey: (row: T) => string;
  columns: KpiDetailColumn<T>[];
  onRowClick?: (row: T) => void;
  onExportCSV?: () => void;
  onExportXLSX?: () => void;
  emptyMessage?: string;
  totalLabel?: string;
  /** Resumen agregado opcional (p.ej. monto total, %). */
  summary?: ReactNode;
  /** Acción primaria opcional (botón a la derecha del header). */
  primaryAction?: ReactNode;
}

/**
 * Modal profesional para mostrar el detalle de una tarjeta KPI del admin.
 * - Tabla compacta con scroll interno.
 * - Botón de exportar (CSV/Excel) reutilizable.
 * - Click en fila opcional para abrir el detalle individual del módulo.
 */
export default function KpiDetailModal<T>({
  open,
  onClose,
  title,
  description,
  rows,
  rowKey,
  columns,
  onRowClick,
  onExportCSV,
  onExportXLSX,
  emptyMessage = "No hay registros para mostrar.",
  totalLabel = "registros",
  summary,
  primaryAction,
}: KpiDetailModalProps<T>) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[96vw] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                {title}
                <Badge variant="secondary" className="font-mono tabular-nums">
                  {rows.length}
                </Badge>
              </DialogTitle>
              {description && (
                <DialogDescription className="text-xs mt-1">{description}</DialogDescription>
              )}
              {summary && <div className="mt-2">{summary}</div>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {primaryAction}
              {(onExportCSV || onExportXLSX) && rows.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      <FileDown className="w-3.5 h-3.5 mr-1.5" /> Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onExportCSV && (
                      <DropdownMenuItem onClick={onExportCSV}>
                        <FileText className="w-4 h-4 mr-2" /> CSV
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
            </div>
          </div>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="py-16 px-6 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Inbox className="w-10 h-10 opacity-40" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b z-10">
                <tr className="text-xs text-muted-foreground">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "px-3 py-2 font-medium",
                        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={rowKey(r)}
                    className={cn(
                      "border-b last:border-b-0 hover:bg-muted/40 transition-colors",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-3 py-2 align-middle",
                          c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                          c.className,
                        )}
                      >
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}

        <div className="px-5 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {rows.length} {totalLabel}
          </span>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
