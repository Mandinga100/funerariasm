-- Desactivar temporalmente triggers para hacer la asignación inicial del CEO fundador
ALTER TABLE public.user_roles DISABLE TRIGGER USER;

INSERT INTO public.user_roles (user_id, role)
VALUES ('637e3028-414a-4c56-b4a0-6895cd152683'::uuid, 'ceo')
ON CONFLICT DO NOTHING;

ALTER TABLE public.user_roles ENABLE TRIGGER USER;

-- Trigger de protección: el rol CEO del fundador es INAMOVIBLE
CREATE OR REPLACE FUNCTION public.protect_founder_ceo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  founder_id CONSTANT uuid := '637e3028-414a-4c56-b4a0-6895cd152683'::uuid;
BEGIN
  IF TG_OP = 'DELETE' AND OLD.user_id = founder_id AND OLD.role = 'ceo' THEN
    RAISE EXCEPTION 'El rol CEO del fundador (Daniel Misle) es inamovible y no puede ser removido.';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.user_id = founder_id AND OLD.role = 'ceo' AND NEW.role <> 'ceo' THEN
    RAISE EXCEPTION 'El rol CEO del fundador (Daniel Misle) es inamovible y no puede ser modificado.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_founder_ceo_trigger ON public.user_roles;
CREATE TRIGGER protect_founder_ceo_trigger
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_founder_ceo();