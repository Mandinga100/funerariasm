
REVOKE ALL ON FUNCTION public.find_person_matches(text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_person_by_identity(text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_person_matches(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_person_by_identity(text,text,text,text,text,text) TO authenticated;
