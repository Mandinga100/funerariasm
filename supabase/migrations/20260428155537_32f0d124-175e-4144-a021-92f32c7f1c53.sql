-- Tabla de invitaciones pendientes
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role app_role NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | revoked
  accepted_at TIMESTAMPTZ,
  accepted_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pending_invitations_email_pending_unique
  ON public.pending_invitations (lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS pending_invitations_email_idx
  ON public.pending_invitations (lower(email));

ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Solo CEO y admin pueden ver
CREATE POLICY "Admins y CEO ven invitaciones"
ON public.pending_invitations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'));

-- Solo CEO y admin pueden crear
CREATE POLICY "Admins y CEO crean invitaciones"
ON public.pending_invitations FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
  AND invited_by = auth.uid()
  -- Solo CEO puede invitar como ceo o admin
  AND (
    role = 'moderator'
    OR public.has_role(auth.uid(), 'ceo')
  )
);

-- Solo CEO y admin pueden actualizar (revocar)
CREATE POLICY "Admins y CEO actualizan invitaciones"
ON public.pending_invitations FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'));

-- Solo CEO y admin pueden eliminar
CREATE POLICY "Admins y CEO eliminan invitaciones"
ON public.pending_invitations FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'));

-- Trigger updated_at
DROP TRIGGER IF EXISTS pending_invitations_set_updated_at ON public.pending_invitations;
CREATE TRIGGER pending_invitations_set_updated_at
BEFORE UPDATE ON public.pending_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función que se ejecuta cuando se crea un nuevo usuario en auth.users:
-- si su correo coincide con una invitación pendiente, le asigna el rol y marca la invitación.
CREATE OR REPLACE FUNCTION public.apply_pending_invitation_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, role
    INTO v_invitation
    FROM public.pending_invitations
   WHERE lower(email) = lower(NEW.email)
     AND status = 'pending'
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_invitation.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Asignar rol si no lo tiene
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_invitation.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Marcar invitación como aceptada
  UPDATE public.pending_invitations
     SET status = 'accepted',
         accepted_at = now(),
         accepted_user_id = NEW.id,
         updated_at = now()
   WHERE id = v_invitation.id;

  RETURN NEW;
END;
$$;

-- Trigger en auth.users (después del trigger handle_new_user existente)
DROP TRIGGER IF EXISTS on_auth_user_created_apply_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_apply_invitation
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.apply_pending_invitation_on_signup();