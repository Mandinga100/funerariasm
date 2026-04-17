-- ============== ai_action_settings (catálogo + toggle + costo) ==============
CREATE TABLE public.ai_action_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_cost_usd NUMERIC(10,5) NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_action_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin y CEO leen ajustes IA"
  ON public.ai_action_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admin y CEO editan ajustes IA"
  ON public.ai_action_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admin inserta ajustes IA"
  ON public.ai_action_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_action_settings_updated
  BEFORE UPDATE ON public.ai_action_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== ai_action_invocations (registro de usos) ==============
CREATE TABLE public.ai_action_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL,
  user_id UUID,
  estimated_cost_usd NUMERIC(10,5) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_invocations_action_created
  ON public.ai_action_invocations (action_key, created_at DESC);
CREATE INDEX idx_ai_invocations_created
  ON public.ai_action_invocations (created_at DESC);

ALTER TABLE public.ai_action_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin y CEO leen invocaciones IA"
  ON public.ai_action_invocations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Autenticados registran invocaciones IA"
  ON public.ai_action_invocations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============== Seed catálogo de acciones IA actuales ==============
INSERT INTO public.ai_action_settings (action_key, module, display_name, description, estimated_cost_usd, model) VALUES
  ('blog.standardize_all', 'Blog', 'Estandarizar todos (IA)',
   'Recorre los artículos publicados y reformatea su HTML/Markdown con IA: limpia estructura, normaliza encabezados, listas y citas, aplicando el estilo editorial sin alterar el contenido.',
   0.020, 'google/gemini-2.5-flash'),
  ('blog.generate_article', 'Blog', 'Generar artículo con IA',
   'Crea un artículo completo (~800-1200 palabras) optimizado para SEO/AEO a partir de un tema y categoría, con tono empático y profesional de la funeraria.',
   0.015, 'google/gemini-2.5-flash'),
  ('blog.generate_content_field', 'Blog', 'Generar contenido del cuerpo',
   'Genera el cuerpo de un artículo en el editor a partir del título y categoría actuales. Reemplaza el campo Contenido para revisión antes de publicar.',
   0.012, 'google/gemini-2.5-flash'),
  ('dashboard.executive_summary', 'Dashboard', 'Generar Insights Ejecutivos',
   'Analiza los KPIs del rango seleccionado (leads, casos, ingresos, conversión) y entrega un resumen en lenguaje natural con tendencias, alertas y recomendaciones priorizadas.',
   0.010, 'google/gemini-2.5-flash'),
  ('crm.classify_all_leads', 'CRM Leads', 'Clasificar todos los leads',
   'Procesa con IA todos los leads sin análisis: detecta intención, urgencia, plan estimado, valor potencial y siguiente acción recomendada.',
   0.008, 'google/gemini-2.5-flash'),
  ('crm.classify_lead', 'CRM Leads', 'Analizar lead individual',
   'Analiza un lead específico: clasifica intención, detecta plan probable, valor estimado, prioridad y sugiere la próxima acción comercial.',
   0.005, 'google/gemini-2.5-flash');