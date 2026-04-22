import { useMemo } from "react";
import { useTablePreferences, sortRows } from "./use-table-preferences";

/**
 * Ordena el dataset COMPLETO (antes de paginar) usando las preferencias
 * persistidas (`sortKey` + `sortDir`) de la tabla.
 *
 * Pasa `accessors` para columnas que requieren un orden custom
 * (por ejemplo prioridad funeraria de pagos/etapas), o para fechas
 * almacenadas como Date string. Si no hay accessor para una columna,
 * se usa `row[sortKey]` con detección automática de número/fecha/string.
 *
 * Uso:
 *   const { sorted, sortHandled } = useSortedRows("admin_casos", filtered, {
 *     payment_status: (r) => paymentRank(r.payment_status),
 *     pipeline_stage: (r) => pipelineRank(r.pipeline_stage),
 *   });
 *   const paginated = sorted.slice(from, to + 1);
 *   <SortableTable rows={paginated} externalSort={sortHandled} ... />
 */
export function useSortedRows<T>(
  tableKey: string,
  rows: T[],
  accessors?: Record<string, (row: T) => unknown>,
) {
  const { prefs } = useTablePreferences(tableKey);

  const sorted = useMemo(() => {
    if (!prefs.sortKey) return rows;
    return sortRows(
      rows as unknown as Record<string, unknown>[],
      prefs.sortKey,
      prefs.sortDir,
      (r, key) => {
        const acc = accessors?.[key];
        if (acc) return acc(r as unknown as T);
        return (r as Record<string, unknown>)[key];
      },
    ) as unknown as T[];
  }, [rows, prefs.sortKey, prefs.sortDir, accessors]);

  // No-op para indicar a SortableTable que el orden ya viene aplicado.
  const sortHandled = () => {};

  return { sorted, prefs, sortHandled };
}
