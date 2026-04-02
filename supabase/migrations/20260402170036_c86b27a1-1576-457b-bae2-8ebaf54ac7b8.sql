
-- Create obituaries table
CREATE TABLE public.obituaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  death_date DATE NOT NULL,
  photo_url TEXT,
  biography TEXT,
  wake_location TEXT,
  wake_schedule TEXT,
  ceremony_location TEXT,
  ceremony_schedule TEXT,
  family_message TEXT,
  family_names TEXT,
  city TEXT DEFAULT 'Santiago',
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.obituaries ENABLE ROW LEVEL SECURITY;

-- Public can read published obituaries
CREATE POLICY "Anyone can read published obituaries"
ON public.obituaries
FOR SELECT
TO public
USING (published = true);

-- Authenticated users have full access
CREATE POLICY "Authenticated full access to obituaries"
ON public.obituaries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Anon can insert (for edge function seeding)
CREATE POLICY "Anon can insert obituaries"
ON public.obituaries
FOR INSERT
TO anon
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_obituaries_updated_at
BEFORE UPDATE ON public.obituaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
