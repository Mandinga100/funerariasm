
-- Prevent non-CEO users from assigning CEO role (privilege escalation protection)
CREATE OR REPLACE FUNCTION public.prevent_ceo_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If someone is trying to assign CEO role
  IF NEW.role = 'ceo' THEN
    -- Check if the current user already has CEO role
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'ceo'
    ) THEN
      RAISE EXCEPTION 'Solo el CEO puede asignar el rol de CEO. Escalación de privilegios bloqueada.';
    END IF;
  END IF;
  
  -- If someone is trying to modify an existing CEO's role
  IF TG_OP = 'UPDATE' AND OLD.role = 'ceo' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'ceo'
    ) THEN
      RAISE EXCEPTION 'Solo el CEO puede modificar roles de CEO.';
    END IF;
  END IF;
  
  -- If someone is trying to delete a CEO role
  IF TG_OP = 'DELETE' AND OLD.role = 'ceo' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'ceo'
    ) THEN
      RAISE EXCEPTION 'Solo el CEO puede remover roles de CEO.';
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger for INSERT and UPDATE
CREATE TRIGGER prevent_ceo_escalation_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ceo_escalation();
