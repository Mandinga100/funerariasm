-- Separar el trigger en dos: BEFORE para mutar NEW (timestamps) y AFTER para historial/notificaciones
-- Esto resuelve la violación de FK en agenda_event_history al insertar nuevos eventos.

-- 1) Reemplazar la función para que NO inserte en historial (solo mute NEW)
CREATE OR REPLACE FUNCTION public.handle_agenda_event_before_save()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'finalizado' AND NEW.completed_at IS NULL THEN
        NEW.completed_at := now();
      END IF;
      IF NEW.status = 'cancelado' AND NEW.cancelled_at IS NULL THEN
        NEW.cancelled_at := now();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Función AFTER que escribe historial + notificaciones (cuando la fila ya existe)
CREATE OR REPLACE FUNCTION public.handle_agenda_event_after_save()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_description := 'Estado: ' || OLD.status || ' → ' || NEW.status;
      INSERT INTO public.agenda_event_history (event_id, change_type, old_value, new_value, description, performed_by)
      VALUES (NEW.id, 'status_change',
        jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status),
        v_description, auth.uid());
    END IF;

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

-- 3) Reemplazar el trigger antiguo
DROP TRIGGER IF EXISTS trg_agenda_event_changes ON public.agenda_events;

CREATE TRIGGER trg_agenda_event_before_save
BEFORE INSERT OR UPDATE ON public.agenda_events
FOR EACH ROW EXECUTE FUNCTION public.handle_agenda_event_before_save();

CREATE TRIGGER trg_agenda_event_after_save
AFTER INSERT OR UPDATE ON public.agenda_events
FOR EACH ROW EXECUTE FUNCTION public.handle_agenda_event_after_save();