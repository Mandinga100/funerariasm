REVOKE EXECUTE ON FUNCTION public.get_person_prefill(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_person_prefill(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.link_lead_to_person() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_create_service_case() FROM PUBLIC, anon;