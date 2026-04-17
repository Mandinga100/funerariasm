
-- 1) contact_leads: restrict SELECT to admin/ceo only
DROP POLICY IF EXISTS "Authenticated users can read contact leads" ON public.contact_leads;
CREATE POLICY "Admins and CEO can read contact leads"
  ON public.contact_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'));

-- 2) payment_transactions: restrict SELECT to admin/ceo only
DROP POLICY IF EXISTS "Authenticated can read payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins and CEO can read payment transactions"
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'));

-- 3) family_tracking: remove public-read-all; admins keep ALL access
DROP POLICY IF EXISTS "Public can read own tracking by code" ON public.family_tracking;
-- (Admins full access policy remains. Public lookups must go through a SECURITY DEFINER function or edge function that filters by family_code.)

-- 4) user_roles: attach existing prevent_ceo_escalation function as trigger
DROP TRIGGER IF EXISTS prevent_ceo_escalation_trigger ON public.user_roles;
CREATE TRIGGER prevent_ceo_escalation_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ceo_escalation();
