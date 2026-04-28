-- Eliminar roles duplicados admin/moderator del CEO fundador
-- (su rol 'ceo' permanece intacto y protegido por trigger protect_founder_ceo)
DELETE FROM public.user_roles
WHERE user_id = '637e3028-414a-4c56-b4a0-6895cd152683'
  AND role IN ('admin', 'moderator');