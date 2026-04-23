
-- Vista materializada con estadísticas históricas por urgencia + intención
-- Se refresca manualmente desde el edge function (concurrentemente).
CREATE MATERIALIZED VIEW IF NOT EXISTS public.lead_classification_stats AS
WITH base AS (
  SELECT
    COALESCE(NULLIF(urgency, ''), 'cotizacion') AS urgency,
    COALESCE(NULLIF(intent,  ''), 'consulta_general') AS intent,
    estimated_value,
    (ai_classification ->> 'priority_score')::numeric AS priority_score,
    (ai_classification ->> 'sla_hours')::numeric      AS sla_hours,
    ai_classification ->> 'recommended_channel'       AS recommended_channel,
    ai_classification ->> 'emotional_context'         AS emotional_context,
    pipeline_stage,
    created_at
  FROM public.contact_leads
  WHERE created_at > now() - interval '180 days'
    AND ai_classification IS NOT NULL
    AND ai_classification <> '{}'::jsonb
)
SELECT
  urgency,
  intent,
  COUNT(*)                                                         AS sample_size,
  ROUND(AVG(NULLIF(estimated_value, 0)))::int                      AS avg_value,
  ROUND(AVG(priority_score))::int                                  AS avg_priority,
  ROUND(AVG(sla_hours))::int                                       AS avg_sla_hours,
  MODE() WITHIN GROUP (ORDER BY recommended_channel)               AS top_channel,
  MODE() WITHIN GROUP (ORDER BY emotional_context)                 AS top_emotion,
  ROUND(
    100.0 * SUM(CASE WHEN pipeline_stage IN ('contratado','cerrado') THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0),
  1)::numeric                                                      AS conversion_rate,
  now()                                                            AS computed_at
FROM base
GROUP BY urgency, intent;

CREATE UNIQUE INDEX IF NOT EXISTS lead_classification_stats_pk
  ON public.lead_classification_stats (urgency, intent);

GRANT SELECT ON public.lead_classification_stats TO authenticated, service_role;

-- Función helper: stats consolidados para un par (urgency, intent)
CREATE OR REPLACE FUNCTION public.get_lead_stats(_urgency text, _intent text)
RETURNS TABLE(
  sample_size      bigint,
  avg_value        int,
  avg_priority     int,
  avg_sla_hours    int,
  top_channel      text,
  top_emotion      text,
  conversion_rate  numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sample_size, avg_value, avg_priority, avg_sla_hours,
         top_channel, top_emotion, conversion_rate
  FROM public.lead_classification_stats
  WHERE urgency = COALESCE(_urgency, 'cotizacion')
    AND intent  = COALESCE(_intent,  'consulta_general')
  UNION ALL
  -- Fallback: agregado solo por urgency si el par exacto no existe
  SELECT SUM(sample_size), ROUND(AVG(avg_value))::int, ROUND(AVG(avg_priority))::int,
         ROUND(AVG(avg_sla_hours))::int,
         MODE() WITHIN GROUP (ORDER BY top_channel),
         MODE() WITHIN GROUP (ORDER BY top_emotion),
         ROUND(AVG(conversion_rate),1)::numeric
  FROM public.lead_classification_stats
  WHERE urgency = COALESCE(_urgency, 'cotizacion')
  LIMIT 1;
$$;

-- Función para refrescar la vista (la llama el edge function periódicamente)
CREATE OR REPLACE FUNCTION public.refresh_lead_classification_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.lead_classification_stats;
EXCEPTION WHEN feature_not_supported THEN
  -- Primera ejecución (sin índice único todavía): refresh no concurrente
  REFRESH MATERIALIZED VIEW public.lead_classification_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_stats(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_lead_classification_stats() TO authenticated, service_role;
