import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Persistencia híbrida de filtros + búsqueda por módulo y por usuario.
 *
 * - Lectura inmediata desde localStorage (clave: filters:{user|anon}:{moduleKey})
 * - Sync en background a `user_table_preferences` con table_key = `filters:{moduleKey}`
 *   usando un debounce de 600ms para no inundar la red.
 * - Hidrata desde backend cuando el usuario está autenticado, sobrescribiendo
 *   el estado local si el backend trae datos (multi-dispositivo).
 *
 * Uso:
 *   const { filters, setFilter, setFilters, hydrated } =
 *     usePersistentFilters("admin_casos", {
 *       searchQuery: "",
 *       filterPipeline: "all",
 *       filterPayment: "all",
 *     });
 */
export function usePersistentFilters<T extends Record<string, unknown>>(
  moduleKey: string,
  defaults: T,
) {
  const [userId, setUserId] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<T>(defaults);
  const [hydrated, setHydrated] = useState(false);
  const syncTimer = useRef<number | null>(null);
  const defaultsRef = useRef(defaults);

  const tableKey = `filters:${moduleKey}`;
  const storageKey = (uid: string | null) => `flt-prefs:${uid ?? "anon"}:${moduleKey}`;

  // Resolver usuario actual
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

  // Hidratar: localStorage primero, luego backend si autenticado
  useEffect(() => {
    let cancelled = false;

    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<T>;
        setFiltersState((curr) => ({ ...defaultsRef.current, ...curr, ...parsed }));
      }
    } catch {
      /* ignore */
    }

    if (!userId) {
      setHydrated(true);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("user_table_preferences")
        .select("preferences")
        .eq("user_id", userId)
        .eq("table_key", tableKey)
        .maybeSingle();
      if (cancelled) return;
      if (data?.preferences) {
        setFiltersState((curr) => ({
          ...defaultsRef.current,
          ...curr,
          ...(data.preferences as Partial<T>),
        }));
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, userId]);

  // Persistencia (local inmediata + backend con debounce)
  const persist = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduleKey, userId],
  );

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFiltersState((curr) => {
        const next = { ...curr, [key]: value } as T;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setFilters = useCallback(
    (patch: Partial<T>) => {
      setFiltersState((curr) => {
        const next = { ...curr, ...patch } as T;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetFilters = useCallback(() => {
    setFiltersState(defaultsRef.current);
    persist(defaultsRef.current);
  }, [persist]);

  return { filters, setFilter, setFilters, resetFilters, hydrated };
}
