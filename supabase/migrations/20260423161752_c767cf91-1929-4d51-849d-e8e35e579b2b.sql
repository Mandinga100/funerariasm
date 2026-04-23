-- ============================================================
-- BLOQUE P0 #1: CASO FUNERARIO MAESTRO v2
-- ============================================================

-- 1) Extender service_cases con datos del fallecido + estados múltiples + servicio
ALTER TABLE public.service_cases
  ADD COLUMN IF NOT EXISTS deceased_rut TEXT,
  ADD COLUMN IF NOT EXISTS deceased_gender TEXT,
  ADD COLUMN IF NOT EXISTS deceased_relationship TEXT,
  ADD COLUMN IF NOT EXISTS death_place TEXT,
  ADD COLUMN IF NOT EXISTS death_cause TEXT,
  ADD COLUMN IF NOT EXISTS requires_autopsy BOOLEAN NOT NULL DEFAULT false,
  -- Estados múltiples (independientes del pipeline_stage comercial)
  ADD COLUMN IF NOT EXISTS commercial_status TEXT NOT NULL DEFAULT 'cotizando',
  ADD COLUMN IF NOT EXISTS operational_status TEXT NOT NULL DEFAULT 'sin_iniciar',
  ADD COLUMN IF NOT EXISTS documental_status TEXT NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS financial_status TEXT NOT NULL DEFAULT 'sin_pago',
  -- Datos del servicio
  ADD COLUMN IF NOT EXISTS disposition_type TEXT,
  ADD COLUMN IF NOT EXISTS cemetery_name TEXT,
  ADD COLUMN IF NOT EXISTS wake_room TEXT,
  ADD COLUMN IF NOT EXISTS body_pickup_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  -- Saldos
  ADD COLUMN IF NOT EXISTS amount_paid INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CLP';

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_service_cases_commercial_status ON public.service_cases(commercial_status);
CREATE INDEX IF NOT EXISTS idx_service_cases_operational_status ON public.service_cases(operational_status);
CREATE INDEX IF NOT EXISTS idx_service_cases_financial_status ON public.service_cases(financial_status);
CREATE INDEX IF NOT EXISTS idx_service_cases_branch ON public.service_cases(branch);

-- 2) case_milestones — checklist operativo por caso
CREATE TABLE IF NOT EXISTS public.case_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.service_cases(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  assigned_to UUID,
  due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_milestones_case_id ON public.case_milestones(case_id);
CREATE INDEX IF NOT EXISTS idx_case_milestones_status ON public.case_milestones(status);
CREATE INDEX IF NOT EXISTS idx_case_milestones_due_at ON public.case_milestones(due_at);

ALTER TABLE public.case_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gestionan hitos de caso"
  ON public.case_milestones FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE TRIGGER trg_case_milestones_updated
  BEFORE UPDATE ON public.case_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) case_documents — expediente documental tipado
CREATE TABLE IF NOT EXISTS public.case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.service_cases(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  expires_at DATE,
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  uploaded_by UUID,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON public.case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_type ON public.case_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_case_documents_status ON public.case_documents(status);

ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gestionan documentos de caso"
  ON public.case_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE TRIGGER trg_case_documents_updated
  BEFORE UPDATE ON public.case_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) case_status_log — bitácora de cambios de estado
CREATE TABLE IF NOT EXISTS public.case_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.service_cases(id) ON DELETE CASCADE,
  status_area TEXT NOT NULL, -- 'commercial' | 'operational' | 'documental' | 'financial'
  old_value TEXT,
  new_value TEXT NOT NULL,
  reason TEXT,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_status_log_case_id ON public.case_status_log(case_id);
CREATE INDEX IF NOT EXISTS idx_case_status_log_area ON public.case_status_log(status_area);

ALTER TABLE public.case_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins leen bitácora de estados"
  ON public.case_status_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Sistema inserta bitácora"
  ON public.case_status_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- 5) Trigger automático: registra cambios de los 4 estados
CREATE OR REPLACE FUNCTION public.log_case_status_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.commercial_status IS DISTINCT FROM NEW.commercial_status THEN
    INSERT INTO public.case_status_log(case_id, status_area, old_value, new_value, performed_by)
    VALUES (NEW.id, 'commercial', OLD.commercial_status, NEW.commercial_status, auth.uid());
  END IF;
  IF OLD.operational_status IS DISTINCT FROM NEW.operational_status THEN
    INSERT INTO public.case_status_log(case_id, status_area, old_value, new_value, performed_by)
    VALUES (NEW.id, 'operational', OLD.operational_status, NEW.operational_status, auth.uid());
  END IF;
  IF OLD.documental_status IS DISTINCT FROM NEW.documental_status THEN
    INSERT INTO public.case_status_log(case_id, status_area, old_value, new_value, performed_by)
    VALUES (NEW.id, 'documental', OLD.documental_status, NEW.documental_status, auth.uid());
  END IF;
  IF OLD.financial_status IS DISTINCT FROM NEW.financial_status THEN
    INSERT INTO public.case_status_log(case_id, status_area, old_value, new_value, performed_by)
    VALUES (NEW.id, 'financial', OLD.financial_status, NEW.financial_status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_case_status_changes ON public.service_cases;
CREATE TRIGGER trg_log_case_status_changes
  AFTER UPDATE ON public.service_cases
  FOR EACH ROW EXECUTE FUNCTION public.log_case_status_changes();