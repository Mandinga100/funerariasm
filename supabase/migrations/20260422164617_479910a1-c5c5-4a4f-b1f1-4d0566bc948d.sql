CREATE TABLE public.user_table_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_key text NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, table_key)
);

ALTER TABLE public.user_table_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own table preferences"
  ON public.user_table_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own table preferences"
  ON public.user_table_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own table preferences"
  ON public.user_table_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own table preferences"
  ON public.user_table_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_table_preferences_updated_at
  BEFORE UPDATE ON public.user_table_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_table_preferences_user_table ON public.user_table_preferences(user_id, table_key);