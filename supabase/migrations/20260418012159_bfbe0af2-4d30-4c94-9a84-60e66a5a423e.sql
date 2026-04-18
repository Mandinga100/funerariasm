-- ========== BLOG_POSTS ==========
DROP POLICY IF EXISTS "Authenticated full access to blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated can delete blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Anon can insert blog posts" ON public.blog_posts;

CREATE POLICY "CEO can insert blog posts"
ON public.blog_posts FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can update blog posts"
ON public.blog_posts FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete blog posts"
ON public.blog_posts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admin and CEO can read all blog posts"
ON public.blog_posts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- ========== OBITUARIES ==========
DROP POLICY IF EXISTS "Authenticated full access to obituaries" ON public.obituaries;
DROP POLICY IF EXISTS "Authenticated can delete obituaries" ON public.obituaries;
DROP POLICY IF EXISTS "Anon can insert obituaries" ON public.obituaries;

CREATE POLICY "CEO can insert obituaries"
ON public.obituaries FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can update obituaries"
ON public.obituaries FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete obituaries"
ON public.obituaries FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admin and CEO can read all obituaries"
ON public.obituaries FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- ========== MEMORIALS ==========
DROP POLICY IF EXISTS "Authenticated full access to memorials" ON public.memorials;
DROP POLICY IF EXISTS "Authenticated can delete memorials" ON public.memorials;
DROP POLICY IF EXISTS "Anon can insert memorials" ON public.memorials;

CREATE POLICY "CEO can insert memorials"
ON public.memorials FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can update memorials"
ON public.memorials FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete memorials"
ON public.memorials FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admin and CEO can read all memorials"
ON public.memorials FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- ========== BLOG_SUBSCRIBERS ==========
DROP POLICY IF EXISTS "Admins can update subscribers" ON public.blog_subscribers;

CREATE POLICY "CEO can update subscribers"
ON public.blog_subscribers FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role))
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete subscribers"
ON public.blog_subscribers FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));