-- Reescribir notify_urgent_lead para notificar TODOS los leads nuevos
-- (manteniendo la distinción visual: urgentes = type 'urgent', otros = 'new_lead')
CREATE OR REPLACE FUNCTION public.notify_urgent_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  v_is_urgent BOOLEAN;
  v_category TEXT;
  v_emoji TEXT;
  v_title TEXT;
  v_notif_type TEXT;
BEGIN
  -- Clasificación comercial → emoji + título legible
  v_is_urgent := NEW.urgency IN ('inmediata', 'immediate', 'alta', 'high');

  IF v_is_urgent THEN
    v_category := 'urgencia';
    v_emoji := '🚨';
    v_title := '🚨 Lead URGENTE recibido';
    v_notif_type := 'urgent';
  ELSIF NEW.urgency IN ('previsión', 'prevision') THEN
    v_category := 'prevision';
    v_emoji := '🌿';
    v_title := '🌿 Nueva previsión registrada';
    v_notif_type := 'new_lead';
  ELSE
    v_category := 'cotizacion';
    v_emoji := '💰';
    v_title := '💰 Nueva cotización recibida';
    v_notif_type := 'new_lead';
  END IF;

  -- Fanout a todos los admin/ceo
  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'ceo')
  LOOP
    INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      admin_record.user_id,
      v_title,
      v_emoji || ' ' || COALESCE(NEW.name, 'Sin nombre') ||
      CASE WHEN NEW.phone IS NOT NULL THEN ' — Tel: ' || NEW.phone ELSE '' END ||
      CASE WHEN NEW.email IS NOT NULL THEN ' — ' || NEW.email ELSE '' END ||
      CASE WHEN NEW.selected_plan IS NOT NULL THEN ' — Plan: ' || NEW.selected_plan ELSE '' END ||
      ' — Origen: ' || COALESCE(NEW.contact_type, 'web'),
      v_notif_type,
      NEW.id,
      CASE WHEN v_is_urgent THEN 'urgent_lead' ELSE 'lead' END
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Asegurar que el trigger esté activo en INSERT
DROP TRIGGER IF EXISTS notify_lead_inserted ON public.contact_leads;
CREATE TRIGGER notify_lead_inserted
AFTER INSERT ON public.contact_leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_urgent_lead();