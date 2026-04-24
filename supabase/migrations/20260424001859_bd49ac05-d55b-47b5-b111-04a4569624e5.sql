
-- Tabla de preferencias de notificación por usuario (sincronizadas en la nube)
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  sound_enabled boolean NOT NULL DEFAULT true,
  volume numeric NOT NULL DEFAULT 0.6 CHECK (volume >= 0 AND volume <= 1),
  normal_tone text NOT NULL DEFAULT 'soft',
  urgent_tone text NOT NULL DEFAULT 'alarm',
  notif_leads boolean NOT NULL DEFAULT true,
  notif_payments boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede leer/escribir sus propias preferencias
CREATE POLICY "Users read own notif prefs"
  ON public.user_notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own notif prefs"
  ON public.user_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own notif prefs"
  ON public.user_notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notif prefs"
  ON public.user_notification_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER trg_user_notif_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para sincronización inmediata entre dispositivos
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notification_preferences;
