import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface SimulatedCrown {
  id: string;
  offering_type: "flower_crown";
  crown_tier: number;
  donor_name: string;
  donor_message: string;
  amount: number;
  created_at: string;
}

interface CrownLike {
  id: string;
  offering_type: string;
  crown_tier?: number;
  donor_name?: string;
  donor_message?: string;
  amount?: number;
  created_at?: string;
}

interface SimulationInput {
  donorName: string;
  message: string;
  amount: number;
  tier: number;
}

const STORAGE_PREFIX = "sim_crown:";
// Marker written on first load of the tab; if missing on next mount it means
// the page was refreshed (or freshly opened) → purge any stored simulations.
const SESSION_MARKER_KEY = "sim_crown:__session__";

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
 * simulated crown. This guarantees a refresh (which keeps sessionStorage
 * alive) still wipes the preview, while in-app navigations keep it.
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
    /* ignore quota / privacy-mode errors */
  }
}

let purged = false;
function ensurePurgedOnce() {
  if (purged) return;
  purged = true;
  purgeIfFreshLoad();
}

function readStored(memorialId: string): SimulatedCrown | null {
  const ss = safeSession();
  if (!ss) return null;
  try {
    const raw = ss.getItem(storageKey(memorialId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SimulatedCrown;
    if (parsed && parsed.offering_type === "flower_crown" && typeof parsed.crown_tier === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStored(memorialId: string, crown: SimulatedCrown | null) {
  const ss = safeSession();
  if (!ss) return;
  try {
    if (crown) ss.setItem(storageKey(memorialId), JSON.stringify(crown));
    else ss.removeItem(storageKey(memorialId));
  } catch {
    /* ignore */
  }
}

/**
 * Centralized session-only state for the "recently simulated" flower crown.
 *
 * Persistence rules:
 * - Stored in sessionStorage (per-tab, per-memorial) so a soft in-app
 *   navigation back to the same memorial still shows the latest preview.
 * - Wiped on every page refresh / fresh tab load via a session marker, so
 *   F5 always returns to the paid-only baseline.
 * - Wiped right before the page actually unloads (refresh / tab close) as a
 *   defense-in-depth belt-and-braces measure.
 *
 * Concurrency rules:
 * - Only one simulated crown exists at a time per memorial (replaces previous).
 * - A monotonic token cancels stale rapid clicks so the latest tier wins.
 * - Resets when memorialId changes or the component unmounts.
 */
export function useSimulatedCrown(memorialId: string | null) {
  // Run the fresh-load purge synchronously on first import so that the very
  // first useState initializer below already sees a clean storage.
  ensurePurgedOnce();

  const [simulated, setSimulated] = useState<SimulatedCrown | null>(() =>
    memorialId ? readStored(memorialId) : null,
  );
  const tokenRef = useRef(0);
  const activeMemorialRef = useRef<string | null>(memorialId);

  // Sync with memorial change (or unmount). Re-hydrate from sessionStorage
  // so navigating back to a memorial restores its preview within the tab.
  useEffect(() => {
    activeMemorialRef.current = memorialId;
    tokenRef.current = 0;
    setSimulated(memorialId ? readStored(memorialId) : null);
    return () => {
      activeMemorialRef.current = null;
    };
  }, [memorialId]);

  // Defense-in-depth: clear ALL stored simulations right before the page
  // unloads so a hard refresh (or tab close + reopen via session restore)
  // never resurrects a preview.
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

  const simulate = useCallback(
    (input: SimulationInput) => {
      if (!memorialId) return;
      const myToken = ++tokenRef.current;
      const targetMemorial = memorialId;

      const next: SimulatedCrown = {
        id: `demo-crown-${myToken}-${Date.now()}`,
        offering_type: "flower_crown",
        crown_tier: input.tier,
        donor_name: input.donorName,
        donor_message: input.message,
        amount: input.amount,
        created_at: new Date().toISOString(),
      };

      if (
        myToken === tokenRef.current &&
        activeMemorialRef.current === targetMemorial
      ) {
        setSimulated(next);
        writeStored(targetMemorial, next);
      }
    },
    [memorialId],
  );

  const clear = useCallback(() => {
    tokenRef.current++;
    setSimulated(null);
    if (memorialId) writeStored(memorialId, null);
  }, [memorialId]);

  const mergeWithPaid = useCallback(
    <T extends CrownLike>(paidOfferings: T[]): (T | SimulatedCrown)[] => {
      const nonCrowns = paidOfferings.filter(
        (o) => o.offering_type !== "flower_crown",
      );
      if (simulated) return [simulated, ...nonCrowns];
      return paidOfferings;
    },
    [simulated],
  );

  return useMemo(
    () => ({ simulated, simulate, clear, mergeWithPaid }),
    [simulated, simulate, clear, mergeWithPaid],
  );
}
