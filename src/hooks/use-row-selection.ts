import { useCallback, useMemo, useState } from "react";

/**
 * Hook genérico de selección masiva de filas para tablas del admin.
 * - Mantiene un Set de IDs seleccionados.
 * - Soporta seleccionar todos los visibles (filtrados/paginados) y limpiar.
 * - Devuelve helpers de UI (allSelected, someSelected, isSelected, toggle).
 */
export function useRowSelection<T>(getId: (row: T) => string) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setMany = useCallback((ids: string[], value: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (value ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const getSelectionStateFor = useCallback(
    (rows: T[]): "none" | "some" | "all" => {
      if (rows.length === 0 || selectedIds.size === 0) return "none";
      const total = rows.reduce((acc, r) => acc + (selectedIds.has(getId(r)) ? 1 : 0), 0);
      if (total === 0) return "none";
      if (total === rows.length) return "all";
      return "some";
    },
    [selectedIds, getId],
  );

  const toggleAll = useCallback(
    (rows: T[]) => {
      const state = getSelectionStateFor(rows);
      const ids = rows.map(getId);
      setMany(ids, state !== "all");
    },
    [getSelectionStateFor, getId, setMany],
  );

  const getSelectedRows = useCallback(
    (allRows: T[]) => allRows.filter((r) => selectedIds.has(getId(r))),
    [selectedIds, getId],
  );

  const count = selectedIds.size;

  return useMemo(
    () => ({
      selectedIds,
      count,
      isSelected,
      toggle,
      toggleAll,
      clear,
      setMany,
      getSelectionStateFor,
      getSelectedRows,
    }),
    [selectedIds, count, isSelected, toggle, toggleAll, clear, setMany, getSelectionStateFor, getSelectedRows],
  );
}

export type RowSelection<T> = ReturnType<typeof useRowSelection<T>>;
