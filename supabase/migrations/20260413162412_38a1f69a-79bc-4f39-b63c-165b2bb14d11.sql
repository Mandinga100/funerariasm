
-- Create service_cases table
CREATE TABLE public.service_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.contact_leads(id) ON DELETE SET NULL,
  case_number TEXT NOT NULL DEFAULT ('CASO-' || substr(md5(((random())::text || (now())::text)), 1, 8)),
  
  -- Client info (copied from lead)
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_rut TEXT,
  comuna TEXT,
  
  -- Service info
  service_type TEXT DEFAULT 'servicio_funerario',
  service_description TEXT,
  selected_plan TEXT,
  
  -- Deceased info
  deceased_name TEXT,
  deceased_birth_date DATE,
  deceased_death_date DATE,
  
  -- Ceremony info
  ceremony_location TEXT,
  ceremony_date TIMESTAMP WITH TIME ZONE,
  
  -- Assignment
  assigned_to UUID,
  
  -- Pipeline & Payment
  pipeline_stage TEXT NOT NULL DEFAULT 'contactado',
  payment_status TEXT NOT NULL DEFAULT 'pendiente',
  total_amount INTEGER NOT NULL DEFAULT 0,
  
  -- Notes & Documents
  notes TEXT,
  internal_notes TEXT,
  documents TEXT[] DEFAULT '{}',
  
  -- Source tracking
  source TEXT,
  intent TEXT,
  urgency TEXT,
  original_message TEXT,
  
  -- AI data carried over
  ai_classification JSONB DEFAULT '{}',
  ai_summary TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(lead_id)
);

-- Enable RLS
ALTER TABLE public.service_cases ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage service cases"
ON public.service_cases
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- CEO can also read
CREATE POLICY "CEO can read service cases"
ON public.service_cases
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_service_cases_updated_at
BEFORE UPDATE ON public.service_cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create case when lead moves to contactado
CREATE OR REPLACE FUNCTION public.auto_create_service_case()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when pipeline_stage changes TO contactado (or beyond)
  IF (OLD.pipeline_stage = 'nuevo' AND NEW.pipeline_stage IN ('contactado', 'cotizado', 'contratado', 'cerrado')) THEN
    -- Don't duplicate if case already exists
    IF NOT EXISTS (SELECT 1 FROM public.service_cases WHERE lead_id = NEW.id) THEN
      INSERT INTO public.service_cases (
        lead_id, client_name, client_email, client_phone, comuna,
        selected_plan, service_description, source, intent, urgency,
        original_message, ai_classification, ai_summary, pipeline_stage,
        assigned_to
      ) VALUES (
        NEW.id, NEW.name, NEW.email, NEW.phone, NEW.comuna,
        NEW.selected_plan, NEW.message, NEW.source, NEW.intent, NEW.urgency,
        NEW.message, NEW.ai_classification, NEW.ai_summary, NEW.pipeline_stage,
        NEW.assigned_to
      );
    END IF;
  END IF;
  
  -- Sync pipeline_stage changes to existing case
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    UPDATE public.service_cases 
    SET pipeline_stage = NEW.pipeline_stage
    WHERE lead_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_service_case
AFTER UPDATE ON public.contact_leads
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_service_case();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_cases;
