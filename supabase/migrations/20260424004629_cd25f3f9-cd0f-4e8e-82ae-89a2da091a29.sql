-- ============================================================
-- Endurecer políticas INSERT públicas: reemplazar WITH CHECK (true)
-- por validaciones mínimas de integridad. Mantiene acceso público.
-- ============================================================

-- 1) blog_subscribers
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.blog_subscribers;
CREATE POLICY "Anyone can subscribe"
ON public.blog_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(btrim(email)) BETWEEN 5 AND 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

-- 2) comuna_conversion_events
DROP POLICY IF EXISTS "Anyone can insert conversion events" ON public.comuna_conversion_events;
CREATE POLICY "Anyone can insert conversion events"
ON public.comuna_conversion_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  comuna_slug IS NOT NULL
  AND length(btrim(comuna_slug)) BETWEEN 1 AND 80
  AND event_type IS NOT NULL
  AND length(btrim(event_type)) BETWEEN 1 AND 80
);

-- 3) comuna_page_views
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.comuna_page_views;
CREATE POLICY "Anyone can insert page views"
ON public.comuna_page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  comuna_slug IS NOT NULL
  AND length(btrim(comuna_slug)) BETWEEN 1 AND 80
  AND pathname IS NOT NULL
  AND length(btrim(pathname)) BETWEEN 1 AND 500
);

-- 4) condolences
DROP POLICY IF EXISTS "Anyone can submit condolences" ON public.condolences;
CREATE POLICY "Anyone can submit condolences"
ON public.condolences
FOR INSERT
TO anon, authenticated
WITH CHECK (
  memorial_id IS NOT NULL
  AND author_name IS NOT NULL
  AND length(btrim(author_name)) BETWEEN 2 AND 120
  AND message IS NOT NULL
  AND length(btrim(message)) BETWEEN 5 AND 2000
);

-- 5) contact_leads
DROP POLICY IF EXISTS "Anyone can submit contact leads" ON public.contact_leads;
CREATE POLICY "Anyone can submit contact leads"
ON public.contact_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Al menos un canal de contacto o un mensaje real
  (
    (email IS NOT NULL AND length(btrim(email)) BETWEEN 5 AND 254)
    OR (phone IS NOT NULL AND length(btrim(phone)) BETWEEN 6 AND 32)
    OR (message IS NOT NULL AND length(btrim(message)) >= 5)
  )
  -- Si viene email, que tenga forma válida
  AND (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  -- Largos máximos defensivos
  AND (name IS NULL OR length(name) <= 200)
  AND (message IS NULL OR length(message) <= 4000)
);

-- 6) memorial_offerings
DROP POLICY IF EXISTS "Anyone can submit offerings" ON public.memorial_offerings;
CREATE POLICY "Anyone can submit offerings"
ON public.memorial_offerings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  memorial_id IS NOT NULL
  AND offering_type IS NOT NULL
  AND length(btrim(offering_type)) BETWEEN 1 AND 60
  AND (donor_name IS NULL OR length(donor_name) <= 120)
  AND (donor_message IS NULL OR length(donor_message) <= 2000)
  AND (amount IS NULL OR amount >= 0)
);

-- 7) payment_transactions
DROP POLICY IF EXISTS "Anyone can submit payment notifications" ON public.payment_transactions;
CREATE POLICY "Anyone can submit payment notifications"
ON public.payment_transactions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  full_name IS NOT NULL AND length(btrim(full_name)) BETWEEN 2 AND 200
  AND email IS NOT NULL AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND phone IS NOT NULL AND length(btrim(phone)) BETWEEN 6 AND 32
  AND rut  IS NOT NULL AND length(btrim(rut)) BETWEEN 7 AND 20
  AND amount IS NOT NULL AND amount > 0
  AND payment_type IS NOT NULL AND length(btrim(payment_type)) BETWEEN 1 AND 40
);
