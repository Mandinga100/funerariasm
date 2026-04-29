-- Habilitar Realtime para contact_leads (service_cases ya está)
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_leads;

-- Asegurar replica identity FULL para que UPDATE/DELETE entreguen el row completo
ALTER TABLE public.service_cases REPLICA IDENTITY FULL;
ALTER TABLE public.contact_leads REPLICA IDENTITY FULL;