import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS, PageSize } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";

export interface DataTablePaginationProps {
  page: number;
  pageSize: PageSize;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  /** Etiqueta singular/plural para el contador. Ej: "lead" / "casos" */
  itemLabel?: { singular: string; plural: string };
  className?: string;
  /** Si está cargando, deshabilita controles */
  loading?: boolean;
}

/**
 * Componente de paginación profesional estilo shadcn:
 * - Selector de tamaño 10/20/50/100
 * - "Mostrando 1-20 de 348 leads"
 * - Primera | Anterior | n / N | Siguiente | Última
 * - Numeración inteligente (ventana de 5 páginas con elipsis)
 * - Totalmente accesible (aria-labels)
 * - Responsive: en móvil colapsa a controles esenciales
 */
export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  itemLabel = { singular: "registro", plural: "registros" },
  className,
  loading = false,
}: DataTablePaginationProps) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const label = totalCount === 1 ? itemLabel.singular : itemLabel.plural;

  // Ventana de páginas a mostrar (max 5 números)
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  const disabled = loading || totalCount === 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-3 mt-3",
        className
      )}
    >
      {/* Lado izquierdo: contador + selector */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
        <p className="text-xs sm:text-sm">
          {totalCount === 0 ? (
            <>Sin resultados</>
          ) : (
            <>
              Mostrando <span className="font-medium text-foreground">{from.toLocaleString("es-CL")}</span>
              {" – "}
              <span className="font-medium text-foreground">{to.toLocaleString("es-CL")}</span>
              {" de "}
              <span className="font-medium text-foreground">{totalCount.toLocaleString("es-CL")}</span>
              {" "}{label}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs whitespace-nowrap">Filas por página</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v) as PageSize)}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs" aria-label="Filas por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={String(opt)} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lado derecho: controles de navegación */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 hidden sm:inline-flex"
          onClick={() => onPageChange(1)}
          disabled={disabled || page === 1}
          aria-label="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Números de página — solo desktop */}
        <div className="hidden md:flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) =>
            p === "ellipsis" ? (
              <span key={`e-${idx}`} className="px-1.5 text-xs text-muted-foreground select-none">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-8 min-w-[32px] px-2 text-xs"
                onClick={() => onPageChange(p)}
                disabled={loading}
                aria-label={`Página ${p}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Button>
            )
          )}
        </div>

        {/* Indicador compacto — solo móvil/tablet */}
        <div className="md:hidden px-2 text-xs text-muted-foreground whitespace-nowrap">
          <span className="font-medium text-foreground">{page}</span> / {totalPages}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page === totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 hidden sm:inline-flex"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || page === totalPages}
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
