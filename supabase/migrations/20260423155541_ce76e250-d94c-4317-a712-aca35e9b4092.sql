-- 1) Hacer privado el bucket de avatars
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- 2) Restringir SELECT (listado/metadata) sólo a admin/ceo
DROP POLICY IF EXISTS "Avatars son públicamente visibles" ON storage.objects;
DROP POLICY IF EXISTS "Avatars son visibles para autenticados" ON storage.objects;

CREATE POLICY "Admin y CEO leen avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ceo'::public.app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3) Mantener subida por dueño (cada usuario sólo en su carpeta uid/...)
DROP POLICY IF EXISTS "Usuarios suben su propio avatar" ON storage.objects;
CREATE POLICY "Usuarios suben su propio avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Usuarios actualizan su propio avatar" ON storage.objects;
CREATE POLICY "Usuarios actualizan su propio avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Usuarios borran su propio avatar" ON storage.objects;
CREATE POLICY "Usuarios borran su propio avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);