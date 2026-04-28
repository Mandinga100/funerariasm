import { useCallback, useEffect, useMemo, useState } from "react";

export interface SimulatedCondolence {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
}

const STORAGE_PREFIX = "sim_condolences:";
const SESSION_MARKER_KEY = "sim_condolences:__session__";

const storageKey = (memorialId: string) => `${STORAGE_PREFIX}${memorialId}`;

const safeSession = (): Storage | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/**
 * On the very first hook mount of a tab session, purge every stored
 * simulated condolence. Same pattern as useSimulatedCrown: a hard refresh
 * always returns to the empty baseline, while in-app navigation keeps it.
 */
function purgeIfFreshLoad() {
  const ss = safeSession();
  if (!ss) return;
  if (ss.getItem(SESSION_MARKER_KEY)) return;
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < ss.length; i++) {
      const key = ss.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && key !== SESSION_MARKER_KEY) {
        toDelete.push(key);
      }
    }
    toDelete.forEach((k) => ss.removeItem(k));
    ss.setItem(SESSION_MARKER_KEY, "1");
  } catch {
    /* ignore */
  }
}

purgeIfFreshLoad();

function readStored(memorialId: string): SimulatedCondolence[] {
  const ss = safeSession();
  if (!ss) return [];
  try {
    const raw = ss.getItem(storageKey(memorialId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as SimulatedCondolence[];
    return [];
  } catch {
    return [];
  }
}

function writeStored(memorialId: string, list: SimulatedCondolence[]) {
  const ss = safeSession();
  if (!ss) return;
  try {
    if (list.length === 0) ss.removeItem(storageKey(memorialId));
    else ss.setItem(storageKey(memorialId), JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/**
 * Session-only condolences for the 4 template memorials.
 *
 * - Stored per-tab in sessionStorage (per memorial).
 * - Wiped on every hard refresh / fresh tab load.
 * - Wiped right before the page unloads.
 * - Never sent to the database.
 */
export function useSimulatedCondolences(memorialId: string | null) {
  const [list, setList] = useState<SimulatedCondolence[]>(() =>
    memorialId ? readStored(memorialId) : [],
  );

  useEffect(() => {
    setList(memorialId ? readStored(memorialId) : []);
  }, [memorialId]);

  useEffect(() => {
    const handler = () => {
      const ss = safeSession();
      if (!ss) return;
      try {
        const toDelete: string[] = [];
        for (let i = 0; i < ss.length; i++) {
          const key = ss.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) toDelete.push(key);
        }
        toDelete.forEach((k) => ss.removeItem(k));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const add = useCallback(
    (input: { authorName: string; message: string }) => {
      if (!memorialId) return;
      const next: SimulatedCondolence = {
        id: `demo-cond-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        author_name: input.authorName,
        message: input.message,
        created_at: new Date().toISOString(),
      };
      setList((prev) => {
        const updated = [next, ...prev];
        writeStored(memorialId, updated);
        return updated;
      });
    },
    [memorialId],
  );

  return useMemo(() => ({ simulated: list, add }), [list, add]);
}
