-- Allow authenticated users (admins) to delete obituaries, memorials, and blog_posts
CREATE POLICY "Authenticated can delete obituaries"
  ON public.obituaries FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can delete memorials"
  ON public.memorials FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can delete blog posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));