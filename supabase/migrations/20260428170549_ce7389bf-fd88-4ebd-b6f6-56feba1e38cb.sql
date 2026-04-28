-- Asegurar extensión pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Función de limpieza: elimina mensajes y conversaciones cerradas hace >7 días
CREATE OR REPLACE FUNCTION public.cleanup_old_closed_chats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH old_convos AS (
    SELECT id FROM public.chat_conversations
    WHERE status = 'cerrado'
      AND closed_at IS NOT NULL
      AND closed_at < now() - interval '7 days'
  ), del_msgs AS (
    DELETE FROM public.chat_messages
    WHERE conversation_id IN (SELECT id FROM old_convos)
    RETURNING 1
  ), del_convos AS (
    DELETE FROM public.chat_conversations
    WHERE id IN (SELECT id FROM old_convos)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM del_convos;

  RETURN COALESCE(deleted_count, 0);
END;
$$;

-- Programar limpieza cada hora (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-closed-chats');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

SELECT cron.schedule(
  'cleanup-old-closed-chats',
  '0 * * * *',
  $$ SELECT public.cleanup_old_closed_chats(); $$
);

-- Permitir DELETE manual a CEO/Admin sobre conversaciones y mensajes
DROP POLICY IF EXISTS "CEO/Admin eliminan conversaciones" ON public.chat_conversations;
CREATE POLICY "CEO/Admin eliminan conversaciones"
ON public.chat_conversations
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

DROP POLICY IF EXISTS "CEO/Admin eliminan mensajes" ON public.chat_messages;
CREATE POLICY "CEO/Admin eliminan mensajes"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));