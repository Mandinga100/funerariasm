// Sincronización de preferencias de notificación con Lovable Cloud (por usuario).
// Carga al montar, guarda en la nube + localStorage (cache offline), y se suscribe
// a realtime para aplicar cambios al instante en otros dispositivos del mismo usuario.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  setSoundEnabled, setVolume, setNormalTone, setUrgentTone,
  type NormalTone, type UrgentTone,
} from "@/hooks/use-notification-sound";

export interface NotifPrefs {
  sound_enabled: boolean;
  volume: number;            // 0..1
  normal_tone: NormalTone;
  urgent_tone: UrgentTone;
  notif_leads: boolean;
  notif_payments: boolean;
}

const DEFAULTS: NotifPrefs = {
  sound_enabled: true,
  volume: 0.6,
  normal_tone: "soft",
  urgent_tone: "alarm",
  notif_leads: true,
  notif_payments: true,
};

// Aplica las preferencias al storage local que consume el motor de audio
const applyToLocal = (p: NotifPrefs) => {
  setSoundEnabled(p.sound_enabled);
  setVolume(p.volume);
  setNormalTone(p.normal_tone);
  setUrgentTone(p.urgent_tone);
  localStorage.setItem("crm_notif_leads", String(p.notif_leads));
  localStorage.setItem("crm_notif_payments", String(p.notif_payments));
};

export function useNotificationPrefsSync() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const lastWrittenRef = useRef<string>("");

  // Carga inicial desde la nube
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("user_notification_preferences")
        .select("sound_enabled, volume, normal_tone, urgent_tone, notif_leads, notif_payments")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        const next: NotifPrefs = {
          sound_enabled: data.sound_enabled,
          volume: Number(data.volume),
          normal_tone: data.normal_tone as NormalTone,
          urgent_tone: data.urgent_tone as UrgentTone,
          notif_leads: data.notif_leads,
          notif_payments: data.notif_payments,
        };
        setPrefs(next);
        applyToLocal(next);
        lastWrittenRef.current = JSON.stringify(next);
      } else {
        // Primera vez: subir defaults (o lo que ya tenga local) a la nube
        applyToLocal(DEFAULTS);
        lastWrittenRef.current = JSON.stringify(DEFAULTS);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  // Realtime: aplicar cambios desde otros dispositivos
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-prefs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notification_preferences", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Partial<NotifPrefs> & { volume?: number | string };
          if (!row || typeof row.volume === "undefined") return;
          const next: NotifPrefs = {
            sound_enabled: !!row.sound_enabled,
            volume: Number(row.volume),
            normal_tone: (row.normal_tone as NormalTone) ?? "soft",
            urgent_tone: (row.urgent_tone as UrgentTone) ?? "alarm",
            notif_leads: !!row.notif_leads,
            notif_payments: !!row.notif_payments,
          };
          const serial = JSON.stringify(next);
          // Evita loop si el cambio vino de esta misma sesión
          if (serial === lastWrittenRef.current) return;
          lastWrittenRef.current = serial;
          setPrefs(next);
          applyToLocal(next);
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  // Guardar en la nube (upsert) + cache local
  const savePrefs = useCallback(async (next: NotifPrefs) => {
    setPrefs(next);
    applyToLocal(next);
    if (!user?.id) return { error: null };

    const serial = JSON.stringify(next);
    lastWrittenRef.current = serial;

    const { error } = await supabase
      .from("user_notification_preferences")
      .upsert(
        { user_id: user.id, ...next, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    return { error };
  }, [user?.id]);

  return { prefs, setPrefs, savePrefs, loading };
}
