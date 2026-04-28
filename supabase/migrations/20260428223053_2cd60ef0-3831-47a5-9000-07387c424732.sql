-- ETAPA B: Lead → persons → Caso

ALTER TABLE public.contact_leads
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL;

ALTER TABLE public.service_cases
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deceased_person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_leads_person_id ON public.contact_leads(person_id);
CREATE INDEX IF NOT EXISTS idx_service_cases_person_id ON public.service_cases(person_id);
CREATE INDEX IF NOT EXISTS idx_service_cases_deceased_person_id ON public.service_cases(deceased_person_id);

CREATE OR REPLACE FUNCTION public.link_lead_to_person()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person_id UUID;
  v_phone_n TEXT;
  v_email_n TEXT;
BEGIN
  IF NEW.person_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.name IS NULL AND NEW.email IS NULL AND NEW.phone IS NULL THEN RETURN NEW; END IF;

  v_phone_n := public.normalize_phone(NEW.phone);
  v_email_n := public.normalize_email(NEW.email);

  SELECT id INTO v_person_id
    FROM public.persons
   WHERE (v_phone_n IS NOT NULL AND phone_normalized = v_phone_n)
      OR (v_email_n IS NOT NULL AND email_normalized = v_email_n)
   ORDER BY
     CASE WHEN phone_normalized = v_phone_n THEN 0 ELSE 1 END,
     created_at ASC
   LIMIT 1;

  IF v_person_id IS NULL THEN
    INSERT INTO public.persons (full_name, phone, email, comuna, source)
    VALUES (
      COALESCE(NEW.name, 'Sin nombre'),
      NEW.phone, NEW.email, NEW.comuna,
      COALESCE(NEW.source, 'lead')
    )
    RETURNING id INTO v_person_id;
  ELSE
    UPDATE public.persons
       SET full_name = CASE
             WHEN (full_name IS NULL OR full_name = 'Sin nombre') AND NEW.name IS NOT NULL
             THEN NEW.name ELSE full_name END,
           phone = COALESCE(phone, NEW.phone),
           email = COALESCE(email, NEW.email),
           comuna = COALESCE(comuna, NEW.comuna),
           updated_at = now()
     WHERE id = v_person_id;
  END IF;

  NEW.person_id := v_person_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_lead_to_person ON public.contact_leads;
CREATE TRIGGER trg_link_lead_to_person
  BEFORE INSERT ON public.contact_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.link_lead_to_person();

CREATE OR REPLACE FUNCTION public.auto_create_service_case()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.pipeline_stage = 'nuevo' AND NEW.pipeline_stage IN ('contactado','cotizado','contratado','cerrado')) THEN
    IF NOT EXISTS (SELECT 1 FROM public.service_cases WHERE lead_id = NEW.id) THEN
      INSERT INTO public.service_cases (
        lead_id, person_id,
        client_name, client_email, client_phone, comuna,
        selected_plan, service_description, source, intent, urgency,
        original_message, ai_classification, ai_summary, pipeline_stage,
        assigned_to
      ) VALUES (
        NEW.id, NEW.person_id,
        NEW.name, NEW.email, NEW.phone, NEW.comuna,
        NEW.selected_plan, NEW.message, NEW.source, NEW.intent, NEW.urgency,
        NEW.message, NEW.ai_classification, NEW.ai_summary, NEW.pipeline_stage,
        NEW.assigned_to
      );
    END IF;
  END IF;

  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    UPDATE public.service_cases SET pipeline_stage = NEW.pipeline_stage WHERE lead_id = NEW.id;
  END IF;

  IF OLD.person_id IS DISTINCT FROM NEW.person_id AND NEW.person_id IS NOT NULL THEN
    UPDATE public.service_cases SET person_id = NEW.person_id
     WHERE lead_id = NEW.id AND person_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_person_prefill(_person_id UUID)
RETURNS TABLE(
  full_name TEXT, rut TEXT, phone TEXT, email TEXT, comuna TEXT,
  birth_date DATE, total_cases INTEGER, last_case_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.full_name, p.rut, p.phone, p.email, p.comuna, p.birth_date,
    (SELECT COUNT(*)::INTEGER FROM public.service_cases WHERE person_id = p.id),
    (SELECT MAX(created_at) FROM public.service_cases WHERE person_id = p.id)
  FROM public.persons p WHERE p.id = _person_id;
$$;