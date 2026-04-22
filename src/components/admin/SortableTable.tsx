import { ReactNode, useCallback, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useTablePreferences, type SortDirection } from "@/hooks/use-table-preferences";
import SelectionCheckbox from "@/components/admin/SelectionCheckbox";

export interface SortableColumn<T> {
  key: string;
  label: string;
  /** When false, header is not clickable. Default true. */
  sortable?: boolean;
  /** When false, column cannot be resized. Default true. */
  resizable?: boolean;
  /** Default width in px when no preference is stored. */
  defaultWidth?: number;
  /** Min width in px. Default 80. */
  minWidth?: number;
  /** Optional value accessor for sorting. Defaults to row[key]. */
  accessor?: (row: T) => unknown;
  /** Cell renderer. */
  cell: (row: T) => ReactNode;
  /** Optional className applied to the <td>. */
  cellClassName?: string;
  /** Optional alignment of header label. */
  align?: "left" | "right" | "center";
}

interface SortableTableProps<T> {
  tableKey: string;
  columns: SortableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: ReactNode;
  className?: string;
  /** External sort handler (e.g. when sorting happens server-side). When omitted, rows are sorted in-memory. */
  externalSort?: (key: string | null, dir: SortDirection) => void;
  /** Cuando está presente añade una columna inicial de checkbox para selección masiva. */
  selection?: {
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    headerState: "none" | "some" | "all";
    toggleAll: () => void;
  };
}

export function SortableTable<T>({
  tableKey,
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage,
  className,
  externalSort,
  selection,
}: SortableTableProps<T>) {
  const { prefs, setColumnWidth, toggleSort } = useTablePreferences(tableKey);

  // Notify external sort changes
  const lastSortRef = useRef<string>("");
  useEffect(() => {
    const sig = `${prefs.sortKey}:${prefs.sortDir}`;
    if (externalSort && sig !== lastSortRef.current) {
      lastSortRef.current = sig;
      externalSort(prefs.sortKey, prefs.sortDir);
    }
  }, [prefs.sortKey, prefs.sortDir, externalSort]);

  // In-memory sorting if no external handler
  const displayRows = (() => {
    if (externalSort || !prefs.sortKey) return rows;
    const col = columns.find((c) => c.key === prefs.sortKey);
    if (!col) return rows;
    const get = col.accessor ?? ((r: T) => (r as Record<string, unknown>)[prefs.sortKey!]);
    const mul = prefs.sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
      if (typeof av === "boolean" && typeof bv === "boolean")
        return (Number(av) - Number(bv)) * mul;
      const as = String(av);
      const bs = String(bv);
      if (/^\d{4}-\d{2}-\d{2}/.test(as) && /^\d{4}-\d{2}-\d{2}/.test(bs)) {
        return (new Date(as).getTime() - new Date(bs).getTime()) * mul;
      }
      return as.localeCompare(bs, "es", { sensitivity: "base", numeric: true }) * mul;
    });
  })();

  return (
    <div className={cn("rounded-md border overflow-x-auto", className)}>
      <Table style={{ tableLayout: "fixed", width: "100%" }}>
        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => {
              const width = prefs.columnWidths[col.key] ?? col.defaultWidth;
              const isSorted = prefs.sortKey === col.key;
              const sortable = col.sortable !== false;
              const resizable = col.resizable !== false;
              const isLast = idx === columns.length - 1;
              return (
                <TableHead
                  key={col.key}
                  style={width ? { width: `${width}px` } : undefined}
                  className={cn(
                    "relative select-none border-r border-border/60 last:border-r-0 group",
                    sortable && "cursor-pointer hover:bg-muted/40 transition-colors",
                  )}
                  onClick={sortable ? () => toggleSort(col.key) : undefined}
                  aria-sort={
                    isSorted ? (prefs.sortDir === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5 pr-2",
                      col.align === "right" && "justify-end",
                      col.align === "center" && "justify-center",
                    )}
                  >
                    <span className="truncate">{col.label}</span>
                    {sortable && (
                      <span
                        className={cn(
                          "shrink-0 transition-opacity",
                          isSorted ? "opacity-100 text-primary" : "opacity-30 group-hover:opacity-60",
                        )}
                      >
                        {isSorted ? (
                          prefs.sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                  {resizable && !isLast && (
                    <ResizeHandle
                      onResize={(delta) => {
                        const current = prefs.columnWidths[col.key] ?? col.defaultWidth ?? 150;
                        setColumnWidth(col.key, Math.max(col.minWidth ?? 80, current + delta));
                      }}
                    />
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.length === 0 ? (
            <TableRow>
              <td
                colSpan={columns.length}
                className="h-32 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "Sin resultados"}
              </td>
            </TableRow>
          ) : (
            displayRows.map((row) => (
              <TableRow
                key={rowKey(row)}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={cn(
                      "p-2 align-middle border-r border-border/40 last:border-r-0",
                      col.cellClassName,
                    )}
                    style={
                      idx === columns.length - 1
                        ? undefined
                        : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
                    }
                    onClick={(e) => {
                      // Prevent row click on interactive cells (button, switch, dropdown, link)
                      const target = e.target as HTMLElement;
                      if (target.closest("button, [role='switch'], a, input, [data-no-row-click]")) {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const startX = useRef(0);
  const lastX = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      startX.current = e.clientX;
      lastX.current = e.clientX;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const move = (ev: PointerEvent) => {
        const delta = ev.clientX - lastX.current;
        lastX.current = ev.clientX;
        if (delta !== 0) onResize(delta);
      };
      const up = () => {
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", up);
        target.removeEventListener("pointercancel", up);
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", up);
      target.addEventListener("pointercancel", up);
    },
    [onResize],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none group/handle z-10"
    >
      <div className="absolute right-0 top-1/4 h-1/2 w-px bg-border group-hover/handle:bg-primary group-hover/handle:w-0.5 transition-all" />
    </div>
  );
}
