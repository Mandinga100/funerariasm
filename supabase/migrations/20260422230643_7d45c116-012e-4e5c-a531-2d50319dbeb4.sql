-- Permitir que el CEO elimine registros de tablas operacionales
-- para soportar acciones de "borrado" desde el panel admin.

-- contact_leads
CREATE POLICY "CEO can delete contact leads"
ON public.contact_leads FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

-- payment_transactions
CREATE POLICY "CEO can delete payment transactions"
ON public.payment_transactions FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

-- comuna_page_views (limpieza de tracking)
CREATE POLICY "CEO can delete comuna page views"
ON public.comuna_page_views FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

-- comuna_conversion_events (limpieza de tracking)
CREATE POLICY "CEO can delete comuna conversion events"
ON public.comuna_conversion_events FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

-- revenue_attribution (admins ya tienen ALL via política existente; añadimos CEO)
CREATE POLICY "CEO can delete revenue attribution"
ON public.revenue_attribution FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

-- Nota: family_tracking, service_cases ya permiten DELETE a admin via política ALL.
-- blog_subscribers ya tiene 'CEO can delete subscribers'.
