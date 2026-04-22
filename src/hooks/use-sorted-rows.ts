import { useMemo } from "react";
import { useTablePreferences, sortRows } from "./use-table-preferences";
import type { SortableColumn } from "@/components/admin/SortableTable";

/**
 * Hook que ordena el dataset COMPLETO según las preferencias persistidas
 * de la tabla. Devuelve también `prefs` para pasar a SortableTable junto a
 * `externalSort` (para que el componente no vuelva a ordenar las filas
 * paginadas).
 *
 * Uso:
 *   const { sorted, prefs, sortHandled } = useSortedRows("admin_casos", filtered, columns);
 *   const paginated = sorted.slice(from, to + 1);
 *   <SortableTable rows={paginated} externalSort={sortHandled} ... />
 */
export function useSortedRows<T>(
  tableKey: string,
  rows: T[],
  columns: SortableColumn<T>[],
) {
  const { prefs } = useTablePreferences(tableKey);

  const sorted = useMemo(() => {
    if (!prefs.sortKey) return rows;
    const col = columns.find((c) => c.key === prefs.sortKey);
    if (!col) return rows;
    const accessor = col.accessor ?? ((r: T) => (r as Record<string, unknown>)[prefs.sortKey!]);
    return sortRows(rows as unknown as Record<string, unknown>[], prefs.sortKey, prefs.sortDir, (r) =>
      accessor(r as unknown as T),
    ) as unknown as T[];
  }, [rows, columns, prefs.sortKey, prefs.sortDir]);

  // No-op: indica a SortableTable que el orden ya viene aplicado desde fuera.
  const sortHandled = () => {};

  return { sorted, prefs, sortHandled };
}
