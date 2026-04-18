-- ========== CONDOLENCES ==========
DROP POLICY IF EXISTS "Authenticated full access to condolences" ON public.condolences;

CREATE POLICY "CEO can update condolences"
ON public.condolences FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete condolences"
ON public.condolences FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admin and CEO can read all condolences"
ON public.condolences FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- ========== MEMORIAL_OFFERINGS ==========
DROP POLICY IF EXISTS "Authenticated full access to offerings" ON public.memorial_offerings;

CREATE POLICY "CEO can update offerings"
ON public.memorial_offerings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete offerings"
ON public.memorial_offerings FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));