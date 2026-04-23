-- 1) Ampliar family_tracking con campos para auto-derivación y visibilidad
ALTER TABLE public.family_tracking
  ADD COLUMN IF NOT EXISTS service_case_id UUID,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS family_phone_normalized TEXT,
  ADD COLUMN IF NOT EXISTS auto_created_from TEXT;

-- Un caso = un tracking
CREATE UNIQUE INDEX IF NOT EXISTS family_tracking_service_case_id_unique
  ON public.family_tracking (service_case_id)
  WHERE service_case_id IS NOT NULL;

-- Búsqueda rápida por código (ya es único pero garantizamos índice)
CREATE INDEX IF NOT EXISTS family_tracking_code_idx
  ON public.family_tracking (family_code);

-- 2) Vista pública segura (sólo datos no sensibles)
CREATE OR REPLACE VIEW public.family_tracking_public
WITH (security_invoker = on) AS
SELECT
  ft.family_code,
  ft.family_name,
  ft.status                                         AS tracking_status,
  ft.assigned_at,
  ft.updated_at,
  sc.deceased_name,
  sc.deceased_death_date,
  sc.pipeline_stage                                 AS service_stage,
  sc.operational_status,
  CASE
    WHEN sc.payment_status = 'pagado'    THEN 'Pagado'
    WHEN sc.payment_status = 'parcial'   THEN 'Pago parcial recibido'
    WHEN sc.payment_status = 'pendiente' THEN 'Pendiente'
    ELSE 'En revisión'
  END                                               AS payment_summary,
  -- Próximo evento PÚBLICO (no tareas internas)
  (
    SELECT jsonb_build_object(
      'title', ae.title,
      'event_type', ae.event_type,
      'start_at', ae.start_at,
      'end_at', ae.end_at,
      'location_name', ae.location_name,
      'comuna', ae.comuna
    )
    FROM public.agenda_events ae
    WHERE ae.service_case_id = sc.id
      AND ae.status IN ('programado','confirmado','en_curso')
      AND ae.event_type IN ('velorio','ceremonia','sepultacion','cremacion','traslado','retiro','reunion')
      AND ae.start_at >= now() - interval '6 hours'
    ORDER BY ae.start_at ASC
    LIMIT 1
  )                                                 AS next_event,
  -- Documentos pendientes (sólo nombres, no rutas de storage)
  (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'document_type', cd.document_type,
      'document_name', cd.document_name,
      'status', cd.status
    ) ORDER BY cd.created_at), '[]'::jsonb)
    FROM public.case_documents cd
    WHERE cd.case_id = sc.id
      AND cd.status IN ('pendiente','requerido','rechazado')
  )                                                 AS pending_documents
FROM public.family_tracking ft
LEFT JOIN public.service_cases sc ON sc.id = ft.service_case_id
WHERE ft.is_published = true;

COMMENT ON VIEW public.family_tracking_public IS
  'Vista de sólo lectura para familiares. Expone únicamente datos no sensibles. La página /seguimiento consulta por family_code.';

GRANT SELECT ON public.family_tracking_public TO anon, authenticated;

-- 3) Función que evalúa si un caso es "100% verificado y urgente"
CREATE OR REPLACE FUNCTION public.case_is_eligible_for_auto_tracking(
  _case_id UUID,
  _event_priority TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
BEGIN
  SELECT
    deceased_name, deceased_rut, deceased_death_date,
    client_name, client_phone, client_email,
    urgency, selected_plan, service_type
  INTO c
  FROM public.service_cases
  WHERE id = _case_id;

  IF c IS NULL THEN RETURN false; END IF;

  -- Datos del fallecido
  IF c.deceased_name IS NULL OR c.deceased_rut IS NULL OR c.deceased_death_date IS NULL THEN
    RETURN false;
  END IF;

  -- Datos del cliente/familia (nombre + al menos un canal)
  IF c.client_name IS NULL OR (c.client_phone IS NULL AND c.client_email IS NULL) THEN
    RETURN false;
  END IF;

  -- Plan o servicio definido
  IF c.selected_plan IS NULL AND c.service_type IS NULL THEN
    RETURN false;
  END IF;

  -- Urgencia: caso urgente o evento crítico/alta prioridad
  IF c.urgency IN ('inmediata','urgente') THEN
    RETURN true;
  END IF;
  IF _event_priority IN ('alta','critica') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 4) Trigger: cuando un evento de agenda pasa a 'en_curso', auto-derivar a tracking
CREATE OR REPLACE FUNCTION public.handle_agenda_event_to_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case        RECORD;
  v_tracking_id UUID;
  v_eligible    BOOLEAN;
  v_phone_norm  TEXT;
BEGIN
  -- Sólo cuando el evento entra a en_curso (en INSERT o UPDATE)
  IF NEW.status <> 'en_curso' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'en_curso' THEN RETURN NEW; END IF;
  IF NEW.service_case_id IS NULL THEN RETURN NEW; END IF;

  v_eligible := public.case_is_eligible_for_auto_tracking(NEW.service_case_id, NEW.priority);
  IF NOT v_eligible THEN RETURN NEW; END IF;

  SELECT * INTO v_case FROM public.service_cases WHERE id = NEW.service_case_id;

  -- Normalizar teléfono (formato +56...)
  IF v_case.client_phone IS NOT NULL THEN
    v_phone_norm := regexp_replace(v_case.client_phone, '[^0-9+]', '', 'g');
    IF v_phone_norm !~ '^\+' THEN
      IF length(v_phone_norm) = 9 THEN
        v_phone_norm := '+56' || v_phone_norm;
      ELSIF length(v_phone_norm) = 11 AND v_phone_norm LIKE '56%' THEN
        v_phone_norm := '+' || v_phone_norm;
      END IF;
    END IF;
  END IF;

  -- ¿Ya existe tracking para este caso?
  SELECT id INTO v_tracking_id
  FROM public.family_tracking
  WHERE service_case_id = NEW.service_case_id
  LIMIT 1;

  IF v_tracking_id IS NOT NULL THEN
    -- Sólo asegurar que esté publicado y refrescar estado
    UPDATE public.family_tracking
    SET is_published          = true,
        published_at          = COALESCE(published_at, now()),
        status                = 'en_proceso',
        family_phone_normalized = COALESCE(family_phone_normalized, v_phone_norm),
        updated_at            = now()
    WHERE id = v_tracking_id;
    RETURN NEW;
  END IF;

  -- Crear nuevo tracking PUBLICADO (porque pasamos por filtro de urgencia)
  INSERT INTO public.family_tracking (
    service_case_id, family_name, family_email, family_phone, family_phone_normalized,
    status, is_published, published_at, auto_created_from, notes
  ) VALUES (
    NEW.service_case_id,
    COALESCE(v_case.client_name, 'Familia ' || COALESCE(v_case.deceased_name, 'sin nombre')),
    v_case.client_email,
    v_case.client_phone,
    v_phone_norm,
    'en_proceso',
    true,
    now(),
    'agenda_en_curso',
    'Auto-creado desde evento de agenda en curso (' || NEW.title || ')'
  )
  RETURNING id INTO v_tracking_id;

  -- Notificar al responsable del evento (si existe)
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
    SELECT
      NEW.assigned_to,
      '👪 Tracking familiar auto-creado',
      'Caso ' || v_case.case_number || ' (' || COALESCE(v_case.deceased_name,'sin nombre') ||
      ') derivado a Tracking. Código: ' || ft.family_code ||
      CASE
        WHEN v_case.client_phone IS NOT NULL AND v_case.client_email IS NOT NULL THEN ' — se notificará por WhatsApp y correo.'
        WHEN v_case.client_phone IS NOT NULL THEN ' — se notificará por WhatsApp.'
        WHEN v_case.client_email IS NOT NULL THEN ' — se notificará por correo.'
        ELSE ''
      END,
      'info',
      ft.id,
      'family_tracking'
    FROM public.family_tracking ft
    WHERE ft.id = v_tracking_id;
  END IF;

  -- Notificar también a admins/CEO
  INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
  SELECT
    ur.user_id,
    '🔔 Nuevo tracking publicado',
    'Caso ' || v_case.case_number || ' visible para la familia (urgente).',
    'info',
    v_tracking_id,
    'family_tracking'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','ceo')
    AND ur.user_id <> COALESCE(NEW.assigned_to, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agenda_to_tracking_ins ON public.agenda_events;
DROP TRIGGER IF EXISTS trg_agenda_to_tracking_upd ON public.agenda_events;

CREATE TRIGGER trg_agenda_to_tracking_ins
AFTER INSERT ON public.agenda_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_agenda_event_to_tracking();

CREATE TRIGGER trg_agenda_to_tracking_upd
AFTER UPDATE OF status ON public.agenda_events
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_agenda_event_to_tracking();
