import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SortDirection = "asc" | "desc";

export interface TablePreferences {
  columnWidths: Record<string, number>;
  sortKey: string | null;
  sortDir: SortDirection;
}

const DEFAULT_PREFS: TablePreferences = {
  columnWidths: {},
  sortKey: null,
  sortDir: "asc",
};

const storageKey = (tableKey: string, userId: string | null) =>
  `tbl-prefs:${userId ?? "anon"}:${tableKey}`;

/**
 * Hybrid persistence for sortable & resizable admin tables.
 * - Reads/writes localStorage immediately (per user + table key).
 * - Syncs to user_table_preferences in the background when authenticated.
 */
export function useTablePreferences(tableKey: string, defaults?: Partial<TablePreferences>) {
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<TablePreferences>({ ...DEFAULT_PREFS, ...defaults });
  const hydratedRef = useRef(false);
  const syncTimer = useRef<number | null>(null);

  // Resolve current user once
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Hydrate: localStorage first, then backend (override if newer)
  useEffect(() => {
    if (hydratedRef.current && userId === null) return;

    try {
      const raw = localStorage.getItem(storageKey(tableKey, userId));
      if (raw) {
        const parsed = JSON.parse(raw) as TablePreferences;
        setPrefs((curr) => ({ ...curr, ...parsed }));
      }
    } catch {
      /* ignore */
    }
    hydratedRef.current = true;

    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("user_table_preferences")
        .select("preferences")
        .eq("user_id", userId)
        .eq("table_key", tableKey)
        .maybeSingle();
      if (data?.preferences) {
        setPrefs((curr) => ({ ...curr, ...(data.preferences as Partial<TablePreferences>) }));
      }
    })();
  }, [tableKey, userId]);

  // Persist (debounced) — local immediate, backend after 600ms idle
  const persist = useCallback(
    (next: TablePreferences) => {
      try {
        localStorage.setItem(storageKey(tableKey, userId), JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      if (!userId) return;
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(async () => {
        await supabase.from("user_table_preferences").upsert(
          [
            {
              user_id: userId,
              table_key: tableKey,
              preferences: next as unknown as never,
            },
          ],
          { onConflict: "user_id,table_key" },
        );
      }, 600);
    },
    [tableKey, userId],
  );

  const setColumnWidth = useCallback(
    (colKey: string, width: number) => {
      setPrefs((curr) => {
        const next: TablePreferences = {
          ...curr,
          columnWidths: { ...curr.columnWidths, [colKey]: Math.max(60, Math.round(width)) },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggleSort = useCallback(
    (colKey: string) => {
      setPrefs((curr) => {
        const nextDir: SortDirection =
          curr.sortKey === colKey && curr.sortDir === "asc" ? "desc" : "asc";
        const next: TablePreferences = { ...curr, sortKey: colKey, sortDir: nextDir };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetWidths = useCallback(() => {
    setPrefs((curr) => {
      const next: TablePreferences = { ...curr, columnWidths: {} };
      persist(next);
      return next;
    });
  }, [persist]);

  return { prefs, setColumnWidth, toggleSort, resetWidths };
}

/** Generic sort helper that handles strings, numbers, dates, booleans, null. */
export function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  key: string | null,
  dir: SortDirection,
  accessor?: (row: T, key: string) => unknown,
): T[] {
  if (!key) return rows;
  const get = accessor ?? ((r: T, k: string) => r[k]);
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = get(a, key);
    const bv = get(b, key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    if (typeof av === "boolean" && typeof bv === "boolean") return (Number(av) - Number(bv)) * mul;
    const as = String(av);
    const bs = String(bv);
    // Detect ISO dates (YYYY-MM-DD or full ISO)
    if (/^\d{4}-\d{2}-\d{2}/.test(as) && /^\d{4}-\d{2}-\d{2}/.test(bs)) {
      return (new Date(as).getTime() - new Date(bs).getTime()) * mul;
    }
    return as.localeCompare(bs, "es", { sensitivity: "base", numeric: true }) * mul;
  });
}
