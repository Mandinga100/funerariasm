-- Tabla de atribución de ingresos por landing de comuna
CREATE TABLE public.revenue_attribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_case_id UUID NOT NULL,
  lead_id UUID,
  comuna_slug TEXT NOT NULL,
  comuna_nombre TEXT,
  attribution_referrer TEXT,
  attribution_first_visit TIMESTAMP WITH TIME ZONE,
  amount INTEGER NOT NULL DEFAULT 0,
  selected_plan TEXT,
  service_type TEXT,
  pipeline_stage TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT revenue_attribution_case_unique UNIQUE (service_case_id)
);

CREATE INDEX idx_revenue_attribution_comuna ON public.revenue_attribution(comuna_slug);
CREATE INDEX idx_revenue_attribution_recorded ON public.revenue_attribution(recorded_at DESC);

ALTER TABLE public.revenue_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and CEO can read revenue attribution"
ON public.revenue_attribution FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admins can manage revenue attribution"
ON public.revenue_attribution FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_revenue_attribution_updated_at
BEFORE UPDATE ON public.revenue_attribution
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función que registra/actualiza la atribución de ingresos
CREATE OR REPLACE FUNCTION public.record_revenue_attribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_metadata JSONB;
  attribution JSONB;
  v_comuna_slug TEXT;
  v_comuna_nombre TEXT;
  v_referrer TEXT;
  v_first_visit TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Solo procesar cuando el caso pasa a contratado o cerrado
  IF NEW.pipeline_stage NOT IN ('contratado', 'cerrado') THEN
    RETURN NEW;
  END IF;

  -- Solo si hay monto válido
  IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Solo si hay lead vinculado
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Solo si cambió el stage o el monto (evita disparos innecesarios)
  IF TG_OP = 'UPDATE' AND OLD.pipeline_stage = NEW.pipeline_stage AND OLD.total_amount = NEW.total_amount THEN
    RETURN NEW;
  END IF;

  -- Leer metadata del lead
  SELECT metadata INTO lead_metadata
  FROM public.contact_leads
  WHERE id = NEW.lead_id;

  IF lead_metadata IS NULL THEN
    RETURN NEW;
  END IF;

  attribution := lead_metadata -> 'comuna_attribution';

  -- Solo si existe atribución de comuna
  IF attribution IS NULL OR attribution->>'comuna_slug' IS NULL THEN
    RETURN NEW;
  END IF;

  v_comuna_slug := attribution->>'comuna_slug';
  v_comuna_nombre := attribution->>'comuna_nombre';
  v_referrer := attribution->>'referrer';
  v_first_visit := NULLIF(attribution->>'first_visit_at', '')::TIMESTAMP WITH TIME ZONE;

  -- Insertar o actualizar (upsert por service_case_id)
  INSERT INTO public.revenue_attribution (
    service_case_id, lead_id, comuna_slug, comuna_nombre,
    attribution_referrer, attribution_first_visit,
    amount, selected_plan, service_type, pipeline_stage, metadata
  ) VALUES (
    NEW.id, NEW.lead_id, v_comuna_slug, v_comuna_nombre,
    v_referrer, v_first_visit,
    NEW.total_amount, NEW.selected_plan, NEW.service_type, NEW.pipeline_stage,
    jsonb_build_object('source', NEW.source, 'attribution', attribution)
  )
  ON CONFLICT (service_case_id) DO UPDATE SET
    amount = EXCLUDED.amount,
    pipeline_stage = EXCLUDED.pipeline_stage,
    selected_plan = EXCLUDED.selected_plan,
    service_type = EXCLUDED.service_type,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_revenue_attribution
AFTER INSERT OR UPDATE OF pipeline_stage, total_amount ON public.service_cases
FOR EACH ROW EXECUTE FUNCTION public.record_revenue_attribution();