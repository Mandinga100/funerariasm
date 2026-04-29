import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mantiene un registro vivo y consistente:
 * - Re-fetch del row completo cuando se llama a refresh()
 * - Suscripción Realtime a UPDATE/DELETE para que cualquier guardado
 *   (en cualquier pestaña / por otro operador) se refleje al instante.
 *
 * Uso típico en sheets de detalle (Casos, Leads, etc.).
 */
export function useLiveRecord<T extends { id: string }>(
  table: "service_cases" | "contact_leads",
  initial: T | null,
) {
  const [record, setRecord] = useState<T | null>(initial);
  const idRef = useRef<string | null>(initial?.id ?? null);

  // Mantener id de referencia
  useEffect(() => {
    idRef.current = initial?.id ?? null;
    setRecord(initial);
  }, [initial?.id]);

  const refresh = useCallback(async () => {
    const id = idRef.current;
    if (!id) return null;
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      setRecord(data as unknown as T);
      return data as unknown as T;
    }
    return null;
  }, [table]);

  // Realtime: cualquier UPDATE en este registro lo refresca
  useEffect(() => {
    const id = initial?.id;
    if (!id) return;
    const channel = supabase
      .channel(`live-${table}-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as T;
          if (next && next.id === id) {
            setRecord((prev) => ({ ...(prev ?? ({} as T)), ...next }));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, initial?.id]);

  return { record, setRecord, refresh };
}
