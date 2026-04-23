-- ============================================
-- AGENDA EVENTS - Sistema kanban funerario
-- ============================================

-- Tabla principal de eventos
CREATE TABLE public.agenda_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Información básica
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'reunion',
  -- velorio | ceremonia | cremacion | sepultacion | traslado | retiro | reunion | tarea | llamada | otro
  
  -- Estado y prioridad
  status TEXT NOT NULL DEFAULT 'programado',
  -- programado | confirmado | en_curso | finalizado | cancelado | reprogramado
  priority TEXT NOT NULL DEFAULT 'normal',
  -- baja | normal | alta | critica
  
  -- Tiempo
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  
  -- Ubicación
  location_name TEXT,
  address TEXT,
  comuna TEXT,
  
  -- Contacto / familia
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  
  -- Vinculación al ecosistema CRM
  service_case_id UUID REFERENCES public.service_cases(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.contact_leads(id) ON DELETE SET NULL,
  memorial_id UUID REFERENCES public.memorials(id) ON DELETE SET NULL,
  obituary_id UUID REFERENCES public.obituaries(id) ON DELETE SET NULL,
  
  -- Asignación
  assigned_to UUID,
  created_by UUID NOT NULL,
  
  -- Recordatorios
  reminder_minutes_before INTEGER DEFAULT 60,
  reminded_at TIMESTAMP WITH TIME ZONE,
  
  -- Notas y metadata
  internal_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  CONSTRAINT agenda_events_time_check CHECK (end_at >= start_at)
);

-- Índices
CREATE INDEX idx_agenda_events_start_at ON public.agenda_events(start_at);
CREATE INDEX idx_agenda_events_status ON public.agenda_events(status);
CREATE INDEX idx_agenda_events_assigned_to ON public.agenda_events(assigned_to);
CREATE INDEX idx_agenda_events_service_case ON public.agenda_events(service_case_id);
CREATE INDEX idx_agenda_events_lead ON public.agenda_events(lead_id);
CREATE INDEX idx_agenda_events_event_type ON public.agenda_events(event_type);
CREATE INDEX idx_agenda_events_priority ON public.agenda_events(priority);

-- RLS
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y CEO leen agenda"
  ON public.agenda_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admins crean eventos agenda"
  ON public.agenda_events FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
    AND auth.uid() = created_by
  );

CREATE POLICY "Admins editan eventos agenda"
  ON public.agenda_events FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Solo CEO elimina eventos agenda"
  ON public.agenda_events FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'ceo'::app_role));

-- Trigger updated_at
CREATE TRIGGER trg_agenda_events_updated_at
  BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ASISTENTES adicionales por evento
-- ============================================
CREATE TABLE public.agenda_event_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.agenda_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'apoyo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_agenda_attendees_event ON public.agenda_event_attendees(event_id);
CREATE INDEX idx_agenda_attendees_user ON public.agenda_event_attendees(user_id);

ALTER TABLE public.agenda_event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y CEO leen asistentes"
  ON public.agenda_event_attendees FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admins gestionan asistentes"
  ON public.agenda_event_attendees FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- ============================================
-- HISTORIAL de cambios
-- ============================================
CREATE TABLE public.agenda_event_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.agenda_events(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  -- created | status_change | reschedule | reassign | cancelled | completed
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_agenda_history_event ON public.agenda_event_history(event_id);
CREATE INDEX idx_agenda_history_created ON public.agenda_event_history(created_at DESC);

ALTER TABLE public.agenda_event_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y CEO leen historial agenda"
  ON public.agenda_event_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admins escriben historial agenda"
  ON public.agenda_event_history FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- ============================================
-- FUNCIÓN: detectar conflictos de horario
-- ============================================
CREATE OR REPLACE FUNCTION public.detect_agenda_conflicts(
  _user_id UUID,
  _start TIMESTAMP WITH TIME ZONE,
  _end TIMESTAMP WITH TIME ZONE,
  _exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, start_at, end_at
  FROM public.agenda_events
  WHERE assigned_to = _user_id
    AND status NOT IN ('cancelado', 'finalizado')
    AND (_exclude_event_id IS NULL OR id <> _exclude_event_id)
    AND tstzrange(start_at, end_at, '[)') && tstzrange(_start, _end, '[)');
$$;

-- ============================================
-- TRIGGER: auto-historial y notificaciones
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_agenda_event_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agenda_event_history (event_id, change_type, new_value, description, performed_by)
    VALUES (
      NEW.id, 'created',
      jsonb_build_object('status', NEW.status, 'start_at', NEW.start_at, 'assigned_to', NEW.assigned_to),
      'Evento creado: ' || NEW.title,
      NEW.created_by
    );

    -- Notificar al responsable
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> NEW.created_by THEN
      INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
      VALUES (
        NEW.assigned_to,
        '📅 Nuevo evento asignado',
        NEW.title || ' — ' || to_char(NEW.start_at AT TIME ZONE 'America/Santiago', 'DD/MM HH24:MI'),
        CASE WHEN NEW.priority IN ('alta','critica') THEN 'urgent' ELSE 'info' END,
        NEW.id, 'agenda_event'
      );
    END IF;

    -- Notificar a admins si es crítico
    IF NEW.priority = 'critica' THEN
      FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','ceo') AND user_id <> NEW.created_by
      LOOP
        INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
          admin_record.user_id,
          '🚨 Evento crítico programado',
          NEW.title || ' — ' || to_char(NEW.start_at AT TIME ZONE 'America/Santiago', 'DD/MM HH24:MI'),
          'urgent', NEW.id, 'agenda_event'
        );
      END LOOP;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Cambio de estado
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_description := 'Estado: ' || OLD.status || ' → ' || NEW.status;
      INSERT INTO public.agenda_event_history (event_id, change_type, old_value, new_value, description, performed_by)
      VALUES (NEW.id, 'status_change',
        jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status),
        v_description, auth.uid());

      IF NEW.status = 'finalizado' AND NEW.completed_at IS NULL THEN
        NEW.completed_at := now();
      END IF;
      IF NEW.status = 'cancelado' AND NEW.cancelled_at IS NULL THEN
        NEW.cancelled_at := now();
      END IF;
    END IF;

    -- Reprogramación
    IF OLD.start_at IS DISTINCT FROM NEW.start_at OR OLD.end_at IS DISTINCT FROM NEW.end_at THEN
      INSERT INTO public.agenda_event_history (event_id, change_type, old_value, new_value, description, performed_by)
      VALUES (NEW.id, 'reschedule',
        jsonb_build_object('start_at', OLD.start_at, 'end_at', OLD.end_at),
        jsonb_build_object('start_at', NEW.start_at, 'end_at', NEW.end_at),
        'Reprogramado', auth.uid());

      IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (NEW.assigned_to, '🔄 Evento reprogramado',
          NEW.title || ' → ' || to_char(NEW.start_at AT TIME ZONE 'America/Santiago', 'DD/MM HH24:MI'),
          'info', NEW.id, 'agenda_event');
      END IF;
    END IF;

    -- Reasignación
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.agenda_event_history (event_id, change_type, old_value, new_value, description, performed_by)
      VALUES (NEW.id, 'reassign',
        jsonb_build_object('assigned_to', OLD.assigned_to), jsonb_build_object('assigned_to', NEW.assigned_to),
        'Reasignación de responsable', auth.uid());

      IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (NEW.assigned_to, '👤 Evento asignado a ti',
          NEW.title || ' — ' || to_char(NEW.start_at AT TIME ZONE 'America/Santiago', 'DD/MM HH24:MI'),
          'info', NEW.id, 'agenda_event');
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agenda_event_changes
  BEFORE INSERT OR UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_agenda_event_changes();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_events;