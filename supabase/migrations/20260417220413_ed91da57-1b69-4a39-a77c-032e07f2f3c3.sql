-- Tabla 1: page_views — registra cada visita a /funeraria/:comuna
CREATE TABLE public.comuna_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comuna_slug text NOT NULL,
  comuna_nombre text,
  session_id text,
  referrer text,
  user_agent text,
  pathname text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comuna_page_views_slug ON public.comuna_page_views(comuna_slug);
CREATE INDEX idx_comuna_page_views_created_at ON public.comuna_page_views(created_at DESC);
CREATE INDEX idx_comuna_page_views_slug_date ON public.comuna_page_views(comuna_slug, created_at DESC);

ALTER TABLE public.comuna_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page views"
ON public.comuna_page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins and CEO can read page views"
ON public.comuna_page_views
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- Tabla 2: conversion_events
CREATE TABLE public.comuna_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comuna_slug text NOT NULL,
  comuna_nombre text,
  event_type text NOT NULL,
  target text,
  session_id text,
  user_agent text,
  pathname text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comuna_conv_slug ON public.comuna_conversion_events(comuna_slug);
CREATE INDEX idx_comuna_conv_event_type ON public.comuna_conversion_events(event_type);
CREATE INDEX idx_comuna_conv_created_at ON public.comuna_conversion_events(created_at DESC);
CREATE INDEX idx_comuna_conv_slug_type_date ON public.comuna_conversion_events(comuna_slug, event_type, created_at DESC);

ALTER TABLE public.comuna_conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert conversion events"
ON public.comuna_conversion_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins and CEO can read conversion events"
ON public.comuna_conversion_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));