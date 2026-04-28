
-- Habilitar pgcrypto para hashing seguro
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLA: memorial_family_access
-- Almacena los accesos de familiares a memoriales (Legados Eternos).
-- Cada acceso tiene:
--   - Un token de link mágico (solo el HASH se guarda, nunca el token plano)
--   - Un código de recuperación cifrado (bcrypt) que el CEO puede entregar
--     al familiar si pierde su link
--   - Sesiones renovables de 30 días (last_used_at + auto-renovación)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.memorial_family_access (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id     UUID NOT NULL,
  family_email    TEXT NOT NULL,
  family_name     TEXT NOT NULL,
  -- Hash SHA-256 del token (token plano nunca se guarda en DB)
  access_token_hash TEXT NOT NULL UNIQUE,
  -- Bcrypt del código de recuperación (12 chars alfanuméricos)
  recovery_code_hash TEXT NOT NULL,
  -- Estado y permisos
  is_active       BOOLEAN NOT NULL DEFAULT true,
  revoked_at      TIMESTAMPTZ,
  revoked_reason  TEXT,
  -- Sesión renovable de 30 días
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  -- Auditoría
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Metadata extra
  notes           TEXT,
  CONSTRAINT memorial_family_access_email_check
    CHECK (family_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(family_email) <= 254),
  CONSTRAINT memorial_family_access_name_check
    CHECK (length(btrim(family_name)) BETWEEN 2 AND 200)
);

CREATE INDEX IF NOT EXISTS idx_mfa_memorial ON public.memorial_family_access (memorial_id);
CREATE INDEX IF NOT EXISTS idx_mfa_email ON public.memorial_family_access (lower(family_email));
CREATE INDEX IF NOT EXISTS idx_mfa_active ON public.memorial_family_access (is_active) WHERE is_active = true;

ALTER TABLE public.memorial_family_access ENABLE ROW LEVEL SECURITY;

-- Solo CEO puede crear/leer/editar/eliminar accesos desde el CRM
CREATE POLICY "CEO full access on memorial_family_access"
  ON public.memorial_family_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ceo'::app_role));

-- IMPORTANTE: NO existe policy pública. Familiares NO consultan esta tabla
-- directamente. Toda validación pasa por RPCs SECURITY DEFINER abajo.

-- ============================================================
-- TRIGGER: actualizar updated_at
-- ============================================================
CREATE TRIGGER trg_mfa_updated_at
  BEFORE UPDATE ON public.memorial_family_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RPC: validate_family_access_token
-- Recibe el token plano, calcula su hash SHA-256, y devuelve
-- los datos del acceso si es válido + renueva la sesión 30 días.
-- Devuelve NULL si el token no existe, está revocado o expirado.
-- SECURITY DEFINER permite leer la tabla sin exponer RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_family_access_token(_token TEXT)
RETURNS TABLE (
  access_id     UUID,
  memorial_id   UUID,
  memorial_slug TEXT,
  memorial_name TEXT,
  family_email  TEXT,
  family_name   TEXT,
  expires_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_access RECORD;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN;
  END IF;

  v_hash := encode(digest(_token, 'sha256'), 'hex');

  SELECT mfa.id, mfa.memorial_id, mfa.family_email, mfa.family_name,
         mfa.is_active, mfa.expires_at, m.slug AS m_slug, m.full_name AS m_name
    INTO v_access
    FROM public.memorial_family_access mfa
    JOIN public.memorials m ON m.id = mfa.memorial_id
   WHERE mfa.access_token_hash = v_hash
   LIMIT 1;

  IF v_access.id IS NULL THEN RETURN; END IF;
  IF NOT v_access.is_active THEN RETURN; END IF;
  IF v_access.expires_at < now() THEN RETURN; END IF;

  -- Renovar sesión 30 días desde último uso
  UPDATE public.memorial_family_access
     SET last_used_at = now(),
         expires_at = now() + INTERVAL '30 days'
   WHERE id = v_access.id;

  RETURN QUERY SELECT
    v_access.id, v_access.memorial_id, v_access.m_slug, v_access.m_name,
    v_access.family_email, v_access.family_name,
    (now() + INTERVAL '30 days')::TIMESTAMPTZ;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_family_access_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_family_access_token(TEXT) TO anon, authenticated;

-- ============================================================
-- RPC: reset_family_access_with_recovery_code
-- Permite al familiar usar su código de recuperación para
-- generar un nuevo token de acceso (se devuelve UNA SOLA VEZ).
-- Requiere: email + código de recuperación (12 chars).
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_family_access_with_recovery_code(
  _email TEXT,
  _recovery_code TEXT,
  _new_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access RECORD;
  v_new_hash TEXT;
BEGIN
  IF _email IS NULL OR _recovery_code IS NULL OR _new_token IS NULL THEN
    RETURN false;
  END IF;
  IF length(_new_token) < 32 THEN
    RETURN false;
  END IF;

  -- Buscar acceso activo por email
  SELECT id, recovery_code_hash, is_active
    INTO v_access
    FROM public.memorial_family_access
   WHERE lower(family_email) = lower(_email)
     AND is_active = true
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_access.id IS NULL THEN RETURN false; END IF;

  -- Comparar código con hash bcrypt
  IF v_access.recovery_code_hash <> crypt(_recovery_code, v_access.recovery_code_hash) THEN
    RETURN false;
  END IF;

  -- Generar nuevo hash y reemplazar token
  v_new_hash := encode(digest(_new_token, 'sha256'), 'hex');

  UPDATE public.memorial_family_access
     SET access_token_hash = v_new_hash,
         expires_at = now() + INTERVAL '30 days',
         last_used_at = now(),
         updated_at = now()
   WHERE id = v_access.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_family_access_with_recovery_code(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_family_access_with_recovery_code(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- RPC: hash_family_credentials (helper para CEO)
-- Recibe token plano + código plano y devuelve los hashes
-- listos para insertar. Solo el CEO puede ejecutarla.
-- ============================================================
CREATE OR REPLACE FUNCTION public.hash_family_credentials(_token TEXT, _recovery_code TEXT)
RETURNS TABLE (token_hash TEXT, recovery_hash TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'ceo'::app_role) THEN
    RAISE EXCEPTION 'Solo el CEO puede generar credenciales de acceso familiar';
  END IF;
  IF _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  IF _recovery_code IS NULL OR length(_recovery_code) < 8 THEN
    RAISE EXCEPTION 'Código de recuperación inválido';
  END IF;
  RETURN QUERY SELECT
    encode(digest(_token, 'sha256'), 'hex'),
    crypt(_recovery_code, gen_salt('bf', 10));
END;
$$;

REVOKE ALL ON FUNCTION public.hash_family_credentials(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hash_family_credentials(TEXT, TEXT) TO authenticated;

-- ============================================================
-- RPC: family_update_memorial
-- Permite al familiar (validado por token) editar su memorial.
-- Verifica el token contra el memorial_id antes de permitir el UPDATE.
-- Solo edita campos permitidos: biography, tribute_text, photo_url.
-- ============================================================
CREATE OR REPLACE FUNCTION public.family_update_memorial(
  _token TEXT,
  _biography TEXT DEFAULT NULL,
  _tribute_text TEXT DEFAULT NULL,
  _photo_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_memorial_id UUID;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN RETURN false; END IF;
  v_hash := encode(digest(_token, 'sha256'), 'hex');

  SELECT memorial_id INTO v_memorial_id
    FROM public.memorial_family_access
   WHERE access_token_hash = v_hash
     AND is_active = true
     AND expires_at > now()
   LIMIT 1;

  IF v_memorial_id IS NULL THEN RETURN false; END IF;

  UPDATE public.memorials
     SET biography    = COALESCE(_biography,    biography),
         tribute_text = COALESCE(_tribute_text, tribute_text),
         photo_url    = COALESCE(_photo_url,    photo_url),
         updated_at   = now()
   WHERE id = v_memorial_id;

  -- Renovar sesión
  UPDATE public.memorial_family_access
     SET last_used_at = now(),
         expires_at = now() + INTERVAL '30 days'
   WHERE access_token_hash = v_hash;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.family_update_memorial(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_update_memorial(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
