-- Eliminar roles duplicados del fundador (Daniel Misle), dejar solo CEO
DELETE FROM public.user_roles
WHERE user_id = '637e3028-414a-4c56-b4a0-6895cd152683'::uuid
  AND role IN ('admin', 'moderator');