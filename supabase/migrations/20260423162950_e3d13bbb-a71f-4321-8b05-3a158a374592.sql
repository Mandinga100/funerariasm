-- ============================================================
-- BLOQUE P0 #3 — Cotizaciones versionadas
-- ============================================================

-- Tabla principal: cotizaciones
CREATE TABLE public.case_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.service_cases(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL DEFAULT ('COT-' || substr(md5((random())::text || (now())::text), 1, 8)),
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'borrador', -- borrador|enviada|aceptada|rechazada|vencida
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CLP',
  valid_until DATE,
  client_notes TEXT,
  internal_notes TEXT,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID,
  accepted_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla detalle: líneas de cotización
CREATE TABLE public.case_quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.case_quotes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  category TEXT, -- servicio|traslado|urna|carroza|sala|cremacion|sepultacion|tramite|otro
  description TEXT NOT NULL,
  catalog_ref TEXT, -- futura referencia a catálogo
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  line_total INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_quotes_case ON public.case_quotes(case_id);
CREATE INDEX idx_case_quotes_status ON public.case_quotes(status);
CREATE INDEX idx_case_quote_items_quote ON public.case_quote_items(quote_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Calcula line_total al insertar/actualizar ítem
CREATE OR REPLACE FUNCTION public.calc_quote_item_total()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.line_total := GREATEST(0, (NEW.quantity * NEW.unit_price)::INTEGER - COALESCE(NEW.discount, 0));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calc_quote_item_total
BEFORE INSERT OR UPDATE ON public.case_quote_items
FOR EACH ROW EXECUTE FUNCTION public.calc_quote_item_total();

-- Recalcula totales del quote cuando cambian ítems
CREATE OR REPLACE FUNCTION public.recalc_quote_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_quote_id UUID;
  v_subtotal INTEGER;
BEGIN
  v_quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.case_quote_items WHERE quote_id = v_quote_id;
  UPDATE public.case_quotes
  SET subtotal = v_subtotal,
      total = GREATEST(0, v_subtotal - COALESCE(discount, 0)),
      updated_at = now()
  WHERE id = v_quote_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_quote_totals
AFTER INSERT OR UPDATE OR DELETE ON public.case_quote_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_quote_totals();

-- Actualiza updated_at en quote
CREATE TRIGGER trg_quote_updated_at
BEFORE UPDATE ON public.case_quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Al aceptar cotización: sincroniza total_amount al caso y marca commercial_status
CREATE OR REPLACE FUNCTION public.sync_accepted_quote_to_case()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'aceptada' AND (OLD.status IS DISTINCT FROM 'aceptada') THEN
    NEW.accepted_at := COALESCE(NEW.accepted_at, now());
    UPDATE public.service_cases
    SET total_amount = NEW.total,
        commercial_status = 'aceptada',
        selected_plan = COALESCE(selected_plan, 'cotizacion-' || NEW.quote_number),
        updated_at = now()
    WHERE id = NEW.case_id;
    -- Marcar otras cotizaciones del caso como vencidas
    UPDATE public.case_quotes
    SET status = 'vencida', updated_at = now()
    WHERE case_id = NEW.case_id AND id <> NEW.id AND status IN ('borrador','enviada');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_accepted_quote
BEFORE UPDATE ON public.case_quotes
FOR EACH ROW EXECUTE FUNCTION public.sync_accepted_quote_to_case();

-- Auto-incrementa versión al crear nueva cotización del mismo caso
CREATE OR REPLACE FUNCTION public.set_quote_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.version IS NULL OR NEW.version = 1 THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM public.case_quotes WHERE case_id = NEW.case_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_quote_version
BEFORE INSERT ON public.case_quotes
FOR EACH ROW EXECUTE FUNCTION public.set_quote_version();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.case_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gestionan cotizaciones"
ON public.case_quotes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admins gestionan ítems de cotización"
ON public.case_quote_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));