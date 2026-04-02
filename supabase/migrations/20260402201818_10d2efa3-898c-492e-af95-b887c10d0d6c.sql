
-- Create memorials table
CREATE TABLE public.memorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  death_date DATE NOT NULL,
  photo_url TEXT,
  biography TEXT,
  tribute_text TEXT,
  city TEXT DEFAULT 'Santiago',
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published memorials"
  ON public.memorials FOR SELECT
  USING (published = true);

CREATE POLICY "Authenticated full access to memorials"
  ON public.memorials FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can insert memorials"
  ON public.memorials FOR INSERT TO anon
  WITH CHECK (true);

-- Create condolences table
CREATE TABLE public.condolences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.condolences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved condolences"
  ON public.condolences FOR SELECT
  USING (approved = true);

CREATE POLICY "Anyone can submit condolences"
  ON public.condolences FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated full access to condolences"
  ON public.condolences FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Trigger for updated_at on memorials
CREATE TRIGGER update_memorials_updated_at
  BEFORE UPDATE ON public.memorials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for condolences
ALTER PUBLICATION supabase_realtime ADD TABLE public.condolences;
