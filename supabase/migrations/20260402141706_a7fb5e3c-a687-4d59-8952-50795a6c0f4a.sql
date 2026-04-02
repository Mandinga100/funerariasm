-- Create contact_leads table for all contact interactions
CREATE TABLE public.contact_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_type TEXT NOT NULL DEFAULT 'general',
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  intent TEXT,
  source TEXT,
  comuna TEXT,
  selected_plan TEXT,
  urgency TEXT DEFAULT 'normal',
  whatsapp_message TEXT,
  status TEXT DEFAULT 'new',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form submissions)
CREATE POLICY "Anyone can submit contact leads"
  ON public.contact_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can read (future admin panel)
CREATE POLICY "Authenticated users can read contact leads"
  ON public.contact_leads
  FOR SELECT
  TO authenticated
  USING (true);