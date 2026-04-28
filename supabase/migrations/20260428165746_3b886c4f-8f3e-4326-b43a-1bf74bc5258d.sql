-- Corrige el trigger de seguridad para que las eliminaciones de roles no-CEO no se cancelen silenciosamente
CREATE OR REPLACE FUNCTION public.prevent_ceo_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'ceo' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'ceo'
      ) THEN
        RAISE EXCEPTION 'Solo el CEO puede remover roles de CEO.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.role = 'ceo' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ceo'
    ) THEN
      RAISE EXCEPTION 'Solo el CEO puede asignar el rol de CEO. Escalación de privilegios bloqueada.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role = 'ceo' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ceo'
    ) THEN
      RAISE EXCEPTION 'Solo el CEO puede modificar roles de CEO.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Limpia roles secundarios del usuario fundador para que solo quede como CEO
DELETE FROM public.user_roles
WHERE user_id = '637e3028-414a-4c56-b4a0-6895cd152683'::uuid
  AND role <> 'ceo';

-- Deduplica cualquier otro usuario con múltiples roles, conservando la mayor jerarquía
WITH ranked_roles AS (
  SELECT
    id,
    user_id,
    role,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY CASE role
        WHEN 'ceo' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'moderator' THEN 3
        ELSE 4
      END,
      id
    ) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked_roles rr
WHERE ur.id = rr.id
  AND rr.rn > 1;

-- Impide que un mismo usuario vuelva a tener más de un rol activo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_single_role'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_single_role UNIQUE (user_id);
  END IF;
END $$;

-- Protege al fundador para que no reciba roles secundarios
CREATE OR REPLACE FUNCTION public.prevent_founder_secondary_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = '637e3028-414a-4c56-b4a0-6895cd152683'::uuid AND NEW.role <> 'ceo' THEN
    RAISE EXCEPTION 'El usuario fundador solo puede conservar el rol CEO.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_founder_secondary_roles_trigger ON public.user_roles;
CREATE TRIGGER prevent_founder_secondary_roles_trigger
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_founder_secondary_roles();