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

/**
 * Centralized local-only state for the "recently simulated" flower crown.
 *
 * Guarantees:
 * - Only one simulated crown exists at a time per memorial (replaces previous).
 * - A monotonically-increasing token cancels stale rapid clicks so the latest
 *   tier always wins, even if React batches multiple updates close together.
 * - Resets when memorialId changes or the component unmounts so simulated
 *   crowns never leak across navigations or fast reloads.
 */
export function useSimulatedCrown(memorialId: string | null) {
  const [simulated, setSimulated] = useState<SimulatedCrown | null>(null);
  const tokenRef = useRef(0);
  const activeMemorialRef = useRef<string | null>(memorialId);

  // Reset whenever the active memorial changes (or component unmounts).
  useEffect(() => {
    activeMemorialRef.current = memorialId;
    setSimulated(null);
    tokenRef.current = 0;
    return () => {
      activeMemorialRef.current = null;
      setSimulated(null);
    };
  }, [memorialId]);

  const simulate = useCallback(
    (input: SimulationInput) => {
      if (!memorialId) return;
      // Bump the token first so any in-flight handler that hasn't applied yet
      // becomes stale and is discarded by the guard below.
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

      // Apply only if still the latest simulation AND we're still on the same
      // memorial — protects against stale closures during fast navigation.
      if (
        myToken === tokenRef.current &&
        activeMemorialRef.current === targetMemorial
      ) {
        setSimulated(next);
      }
    },
    [memorialId],
  );

  const clear = useCallback(() => {
    tokenRef.current++;
    setSimulated(null);
  }, []);

  /**
   * Merge the (already-paid) crowns coming from the DB with the local
   * simulated one. The simulated crown takes visual priority by being placed
   * first, while every other previous crown is hidden so the user only ever
   * sees the most recently donated tier.
   */
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
