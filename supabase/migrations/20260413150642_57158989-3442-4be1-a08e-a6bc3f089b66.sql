
-- Recreate the urgent lead notification trigger
CREATE OR REPLACE FUNCTION public.notify_urgent_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  IF NEW.urgency = 'inmediata' THEN
    FOR admin_record IN 
      SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'ceo')
    LOOP
      INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
      VALUES (
        admin_record.user_id,
        '🚨 Lead URGENTE recibido',
        'Nuevo lead con urgencia inmediata: ' || COALESCE(NEW.name, 'Sin nombre') || 
        CASE WHEN NEW.phone IS NOT NULL THEN ' — Tel: ' || NEW.phone ELSE '' END ||
        CASE WHEN NEW.selected_plan IS NOT NULL THEN ' — Plan: ' || NEW.selected_plan ELSE '' END ||
        ' — ' || COALESCE(NEW.contact_type, 'general'),
        'urgent',
        NEW.id,
        'urgent_lead'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_urgent_lead_insert ON public.contact_leads;

CREATE TRIGGER on_urgent_lead_insert
  AFTER INSERT ON public.contact_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_urgent_lead();
