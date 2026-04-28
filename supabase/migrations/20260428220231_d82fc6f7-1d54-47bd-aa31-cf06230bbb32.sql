
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============ NORMALIZADORES ============
CREATE OR REPLACE FUNCTION public.normalize_rut(_rut text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _rut IS NULL OR length(btrim(_rut)) = 0 THEN NULL
    ELSE upper(regexp_replace(_rut, '[^0-9kK]', '', 'g'))
  END
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone(_phone text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE p text;
BEGIN
  IF _phone IS NULL OR length(btrim(_phone)) = 0 THEN RETURN NULL; END IF;
  p := regexp_replace(_phone, '[^0-9+]', '', 'g');
  IF p !~ '^\+' THEN
    IF length(p) = 9 THEN p := '+56' || p;
    ELSIF length(p) = 11 AND p LIKE '56%' THEN p := '+' || p;
    ELSIF length(p) = 8 THEN p := '+569' || p;
    END IF;
  END IF;
  RETURN p;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_email(_email text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _email IS NULL OR length(btrim(_email)) = 0 THEN NULL
    ELSE lower(btrim(_email))
  END
$$;

-- ============ TABLAS ============
CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  rut text,
  rut_normalized text GENERATED ALWAYS AS (public.normalize_rut(rut)) STORED,
  phone text,
  phone_normalized text GENERATED ALWAYS AS (public.normalize_phone(phone)) STORED,
  email text,
  email_normalized text GENERATED ALWAYS AS (public.normalize_email(email)) STORED,
  comuna text,
  birth_date date,
  notes text,
  contact_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  verified boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX persons_rut_unique ON public.persons (rut_normalized) WHERE rut_normalized IS NOT NULL;
CREATE INDEX persons_phone_idx ON public.persons (phone_normalized) WHERE phone_normalized IS NOT NULL;
CREATE INDEX persons_email_idx ON public.persons (email_normalized) WHERE email_normalized IS NOT NULL;
CREATE INDEX persons_full_name_trgm ON public.persons USING gin (full_name gin_trgm_ops);

CREATE TABLE public.family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  comuna text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.family_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  relationship text,
  role text NOT NULL DEFAULT 'familiar',
  is_primary_contact boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_group_id, person_id)
);
CREATE INDEX fgm_family_idx ON public.family_group_members (family_group_id);
CREATE INDEX fgm_person_idx ON public.family_group_members (person_id);

CREATE TABLE public.client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,
  family_group_id uuid REFERENCES public.family_groups(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'activo',
  score integer NOT NULL DEFAULT 0,
  total_cases integer NOT NULL DEFAULT 0,
  total_paid integer NOT NULL DEFAULT 0,
  last_contacted_at timestamptz,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.person_merge_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  candidate_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  match_reason text NOT NULL,
  confidence integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'pendiente',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_person_id <> candidate_person_id),
  UNIQUE (source_person_id, candidate_person_id)
);

-- ============ TRIGGERS ============
CREATE TRIGGER persons_updated_at BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER family_groups_updated_at BEFORE UPDATE ON public.family_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER client_profiles_updated_at BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_merge_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/CEO gestionan persons" ON public.persons FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role));
CREATE POLICY "Admin/CEO gestionan family_groups" ON public.family_groups FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role));
CREATE POLICY "Admin/CEO gestionan miembros familia" ON public.family_group_members FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role));
CREATE POLICY "Admin/CEO gestionan client_profiles" ON public.client_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role));
CREATE POLICY "Admin/CEO gestionan merge suggestions" ON public.person_merge_suggestions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role));

-- ============ MATCHER (Rutificador) ============
CREATE OR REPLACE FUNCTION public.find_person_matches(
  _rut text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _name text DEFAULT NULL
)
RETURNS TABLE(
  person_id uuid, full_name text, rut text, phone text, email text, comuna text,
  match_reason text, confidence integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH norm AS (
    SELECT
      public.normalize_rut(_rut)     AS rn,
      public.normalize_phone(_phone) AS pn,
      public.normalize_email(_email) AS en,
      btrim(COALESCE(_name,''))      AS nm
  )
  SELECT p.id, p.full_name, p.rut, p.phone, p.email, p.comuna,
         CASE
           WHEN n.rn IS NOT NULL AND p.rut_normalized = n.rn THEN 'rut_exacto'
           WHEN n.pn IS NOT NULL AND p.phone_normalized = n.pn THEN 'telefono'
           WHEN n.en IS NOT NULL AND p.email_normalized = n.en THEN 'email'
           ELSE 'nombre_similar'
         END AS match_reason,
         CASE
           WHEN n.rn IS NOT NULL AND p.rut_normalized = n.rn THEN 100
           WHEN n.pn IS NOT NULL AND p.phone_normalized = n.pn THEN 70
           WHEN n.en IS NOT NULL AND p.email_normalized = n.en THEN 65
           ELSE GREATEST(0, (similarity(p.full_name, n.nm) * 60)::int)
         END AS confidence
  FROM public.persons p, norm n
  WHERE
       (n.rn IS NOT NULL AND p.rut_normalized = n.rn)
    OR (n.pn IS NOT NULL AND p.phone_normalized = n.pn)
    OR (n.en IS NOT NULL AND p.email_normalized = n.en)
    OR (length(n.nm) >= 4 AND p.full_name % n.nm)
  ORDER BY confidence DESC
  LIMIT 25
$$;

-- ============ UPSERT POR IDENTIDAD ============
CREATE OR REPLACE FUNCTION public.upsert_person_by_identity(
  _full_name text,
  _rut text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _comuna text DEFAULT NULL,
  _source text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing_id uuid;
  v_new_id uuid;
  v_rut_n text := public.normalize_rut(_rut);
  v_phone_n text := public.normalize_phone(_phone);
  v_email_n text := public.normalize_email(_email);
  v_match RECORD;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar personas';
  END IF;

  IF v_rut_n IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.persons WHERE rut_normalized = v_rut_n LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.persons SET
        full_name = COALESCE(NULLIF(btrim(_full_name),''), full_name),
        phone = COALESCE(phone, _phone),
        email = COALESCE(email, _email),
        comuna = COALESCE(comuna, _comuna),
        updated_at = now()
      WHERE id = v_existing_id;
      RETURN v_existing_id;
    END IF;
  END IF;

  INSERT INTO public.persons (full_name, rut, phone, email, comuna, source, created_by)
  VALUES (btrim(_full_name), _rut, _phone, _email, _comuna, _source, auth.uid())
  RETURNING id INTO v_new_id;

  IF v_phone_n IS NOT NULL OR v_email_n IS NOT NULL THEN
    FOR v_match IN
      SELECT id,
             CASE WHEN phone_normalized = v_phone_n THEN 'telefono'
                  WHEN email_normalized = v_email_n THEN 'email' END AS reason,
             CASE WHEN phone_normalized = v_phone_n THEN 70 ELSE 65 END AS conf
      FROM public.persons
      WHERE id <> v_new_id
        AND ((v_phone_n IS NOT NULL AND phone_normalized = v_phone_n)
          OR (v_email_n IS NOT NULL AND email_normalized = v_email_n))
    LOOP
      INSERT INTO public.person_merge_suggestions (source_person_id, candidate_person_id, match_reason, confidence)
      VALUES (v_new_id, v_match.id, v_match.reason, v_match.conf)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_new_id;
END;
$$;
