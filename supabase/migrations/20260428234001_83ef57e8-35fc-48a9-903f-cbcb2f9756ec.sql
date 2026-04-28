
-- Trigger en chat_conversations: cuando lead_id pasa de NULL a un valor
-- (o cambia de un lead a otro), garantizamos que ese lead esté como mínimo
-- en pipeline_stage = 'contactado'. Esta es la red de seguridad a nivel DB:
-- protege todos los caminos de vinculación (UI manual, edge functions, RPC)
-- sin depender de que cada llamador recuerde actualizarlo.
CREATE OR REPLACE FUNCTION public.handle_chat_conversation_lead_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_stage TEXT;
BEGIN
  -- Solo nos interesa cuando se asigna o cambia el lead_id (no cuando se quita).
  IF NEW.lead_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.lead_id IS NOT DISTINCT FROM NEW.lead_id THEN
    RETURN NEW;
  END IF;

  SELECT pipeline_stage INTO v_lead_stage
  FROM public.contact_leads
  WHERE id = NEW.lead_id;

  IF v_lead_stage IS NULL OR v_lead_stage = 'nuevo' THEN
    UPDATE public.contact_leads
       SET pipeline_stage   = 'contactado',
           last_contacted_at = COALESCE(last_contacted_at, now()),
           assigned_to       = COALESCE(assigned_to, NEW.assigned_to),
           status            = CASE WHEN status = 'archived' THEN status ELSE 'in_progress' END
     WHERE id = NEW.lead_id
       AND (pipeline_stage = 'nuevo' OR pipeline_stage IS NULL);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_chat_conversation_lead_link ON public.chat_conversations;
CREATE TRIGGER trg_chat_conversation_lead_link
AFTER INSERT OR UPDATE OF lead_id ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.handle_chat_conversation_lead_link();
