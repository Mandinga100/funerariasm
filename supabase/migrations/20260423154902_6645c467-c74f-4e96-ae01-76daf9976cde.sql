-- 1. Bootstrap: temporarily disable anti-escalation trigger to seed the first CEO from the existing admin
ALTER TABLE public.user_roles DISABLE TRIGGER USER;

INSERT INTO public.user_roles (user_id, role)
SELECT '637e3028-414a-4c56-b4a0-6895cd152683'::uuid, 'ceo'::public.app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = '637e3028-414a-4c56-b4a0-6895cd152683'::uuid AND role = 'ceo'
);

ALTER TABLE public.user_roles ENABLE TRIGGER USER;

-- 2. Add CEO access on family_tracking
DROP POLICY IF EXISTS "CEO full access to family tracking" ON public.family_tracking;
CREATE POLICY "CEO full access to family tracking"
ON public.family_tracking
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'ceo'::public.app_role));

-- 3. Harden user_roles: prevent privilege escalation by non-CEO admins
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "CEO can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'ceo'::public.app_role));

CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert non-privileged roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role IN ('moderator'::public.app_role, 'family'::public.app_role)
);

CREATE POLICY "Admins can update non-privileged roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role IN ('moderator'::public.app_role, 'family'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role IN ('moderator'::public.app_role, 'family'::public.app_role)
);

CREATE POLICY "Admins can delete non-privileged roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role IN ('moderator'::public.app_role, 'family'::public.app_role)
);

-- 4. Remove payment_transactions from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.payment_transactions;

-- 5. Restrict avatars bucket listing to authenticated users (direct URL access via CDN unchanged)
DROP POLICY IF EXISTS "Avatars son públicamente visibles" ON storage.objects;
CREATE POLICY "Avatars son visibles para autenticados"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');