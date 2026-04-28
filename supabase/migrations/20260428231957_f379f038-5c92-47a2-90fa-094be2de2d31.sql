-- Columna género opcional en profiles (para avatar fallback determinista)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text
  CHECK (gender IS NULL OR gender IN ('male','female','other'));

-- Tabla de presencia de operadores
CREATE TABLE IF NOT EXISTS public.operator_presence (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','busy','away')),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  session_started_at timestamp with time zone,
  total_online_seconds bigint NOT NULL DEFAULT 0,
  current_session_seconds bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.operator_presence ENABLE ROW LEVEL SECURITY;

-- Lectura: admin/CEO ven a todos
DROP POLICY IF EXISTS "Admin/CEO leen presencia" ON public.operator_presence;
CREATE POLICY "Admin/CEO leen presencia"
  ON public.operator_presence FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role));

-- Insert: cada usuario crea solo su propia fila
DROP POLICY IF EXISTS "Usuario crea su presencia" ON public.operator_presence;
CREATE POLICY "Usuario crea su presencia"
  ON public.operator_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update: cada usuario actualiza solo la suya, admin/CEO pueden cualquiera
DROP POLICY IF EXISTS "Usuario y admin actualizan presencia" ON public.operator_presence;
CREATE POLICY "Usuario y admin actualizan presencia"
  ON public.operator_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role));

CREATE INDEX IF NOT EXISTS idx_operator_presence_status ON public.operator_presence(status, last_seen_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.operator_presence;