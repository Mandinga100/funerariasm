import { useCallback, useEffect, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const DEFAULT_PAGE_SIZE: PageSize = 10;
const STORAGE_PREFIX = "crm:pageSize:";
const PAGE_PREFIX = "crm:page:";

function readStoredPageSize(key: string): PageSize {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    const parsed = Number(raw);
    if (PAGE_SIZE_OPTIONS.includes(parsed as PageSize)) return parsed as PageSize;
  } catch {
    /* ignore */
  }
  return DEFAULT_PAGE_SIZE;
}

function readStoredPage(key: string): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.localStorage.getItem(PAGE_PREFIX + key);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 1) return parsed;
  } catch {
    /* ignore */
  }
  return 1;
}

/**
 * Hook senior-grade de paginación con:
 * - Persistencia por módulo en localStorage (clave única)
 * - Auto-clamp de página cuando cambia el total o pageSize
 * - Reset a página 1 al cambiar pageSize
 * - Devuelve `range` listo para Supabase: .range(from, to)
 */
export function usePagination(storageKey: string, totalCount = 0) {
  const [pageSize, setPageSizeState] = useState<PageSize>(() => readStoredPageSize(storageKey));
  const [page, setPage] = useState(1);

  // Persist
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, String(pageSize));
    } catch {
      /* ignore */
    }
  }, [pageSize, storageKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Clamp page within bounds when total/pageSize cambian
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const setPageSize = useCallback((size: PageSize) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return {
    page,
    pageSize,
    totalPages,
    totalCount,
    from,
    to,
    range: [from, to] as [number, number],
    setPage,
    setPageSize,
    nextPage: () => setPage((p) => Math.min(totalPages, p + 1)),
    prevPage: () => setPage((p) => Math.max(1, p - 1)),
    firstPage: () => setPage(1),
    lastPage: () => setPage(totalPages),
    canPrev: page > 1,
    canNext: page < totalPages,
  };
}
