-- Campos de archivado automático
ALTER TABLE public.contact_leads
  ADD COLUMN IF NOT EXISTS auto_archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_contact_leads_auto_archived
  ON public.contact_leads (auto_archived_at)
  WHERE auto_archived_at IS NOT NULL;

-- Función de archivado automático para leads no atendidos.
-- Se considera "no atendido" si sigue en pipeline_stage = 'nuevo' y nadie lo ha contactado.
CREATE OR REPLACE FUNCTION public.auto_archive_stale_leads()
RETURNS TABLE(archived_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH updated AS (
    UPDATE public.contact_leads
       SET auto_archived_at = now(),
           archive_reason = CASE
             WHEN urgency IN ('inmediata','immediate') THEN 'Urgente sin atender (>48h)'
             WHEN urgency = 'normal' THEN 'Normal sin atender (>7 días)'
             ELSE 'Previsión sin atender (>30 días)'
           END,
           status = 'archived'
     WHERE auto_archived_at IS NULL
       AND (pipeline_stage = 'nuevo' OR pipeline_stage IS NULL)
       AND last_contacted_at IS NULL
       AND (
         (urgency IN ('inmediata','immediate') AND created_at < now() - INTERVAL '48 hours')
         OR (urgency = 'normal' AND created_at < now() - INTERVAL '7 days')
         OR (urgency NOT IN ('inmediata','immediate','normal') AND created_at < now() - INTERVAL '30 days')
       )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_count FROM updated;

  RETURN QUERY SELECT v_count;
END;
$$;

-- Permitir ejecución a admin/CEO autenticados
REVOKE ALL ON FUNCTION public.auto_archive_stale_leads() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_archive_stale_leads() TO authenticated;