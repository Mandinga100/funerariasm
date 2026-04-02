CREATE TABLE public.memorial_offerings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  offering_type TEXT NOT NULL CHECK (offering_type IN ('candle', 'flower', 'flower_crown')),
  donor_name TEXT NOT NULL DEFAULT 'Anónimo',
  donor_message TEXT,
  amount INTEGER DEFAULT 0,
  crown_tier INTEGER DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'simulated' CHECK (payment_status IN ('simulated', 'pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memorial_offerings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view offerings"
  ON public.memorial_offerings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit offerings"
  ON public.memorial_offerings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated full access to offerings"
  ON public.memorial_offerings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_offerings_memorial ON public.memorial_offerings(memorial_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.memorial_offerings;