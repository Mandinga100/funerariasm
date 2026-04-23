
REVOKE SELECT ON public.lead_classification_stats FROM authenticated;
REVOKE SELECT ON public.lead_classification_stats FROM anon;
-- service_role conserva acceso (lo usa el edge function classify-lead)
