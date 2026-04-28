-- 1) Visibilidad por evento (private = sólo dueño/asignado/compartidos/admin; team = visible a todo el equipo en lectura)
ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'team'));

CREATE INDEX IF NOT EXISTS idx_agenda_events_visibility ON public.agenda_events(visibility);
CREATE INDEX IF NOT EXISTS idx_agenda_events_assigned_to ON public.agenda_events(assigned_to);
CREATE INDEX IF NOT EXISTS idx_agenda_events_created_by ON public.agenda_events(created_by);

-- 2) Tabla de compartidos (dueño/admin/ceo comparten un evento con otros usuarios)
CREATE TABLE IF NOT EXISTS public.agenda_event_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.agenda_events(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL,
  shared_by uuid NOT NULL,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (event_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_event_shares_user ON public.agenda_event_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_event_shares_event ON public.agenda_event_shares(event_id);

ALTER TABLE public.agenda_event_shares ENABLE ROW LEVEL SECURITY;

-- Helper SECURITY DEFINER para evitar recursión y lecturas pesadas en políticas
CREATE OR REPLACE FUNCTION public.user_can_view_agenda_event(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agenda_events e
    WHERE e.id = _event_id
      AND (
        e.created_by = _user_id
        OR e.assigned_to = _user_id
        OR e.visibility = 'team'
        OR EXISTS (
          SELECT 1 FROM public.agenda_event_shares s
          WHERE s.event_id = _event_id AND s.shared_with_user_id = _user_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_agenda_event(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agenda_events e
    WHERE e.id = _event_id
      AND (
        e.created_by = _user_id
        OR e.assigned_to = _user_id
        OR EXISTS (
          SELECT 1 FROM public.agenda_event_shares s
          WHERE s.event_id = _event_id AND s.shared_with_user_id = _user_id AND s.can_edit = true
        )
      )
  );
$$;

-- 3) RLS de agenda_event_shares
DROP POLICY IF EXISTS "Admins gestionan compartidos agenda" ON public.agenda_event_shares;
CREATE POLICY "Admins gestionan compartidos agenda"
ON public.agenda_event_shares
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR EXISTS (SELECT 1 FROM public.agenda_events e WHERE e.id = event_id AND e.created_by = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR EXISTS (SELECT 1 FROM public.agenda_events e WHERE e.id = event_id AND e.created_by = auth.uid())
);

DROP POLICY IF EXISTS "Usuarios leen sus compartidos agenda" ON public.agenda_event_shares;
CREATE POLICY "Usuarios leen sus compartidos agenda"
ON public.agenda_event_shares
FOR SELECT
TO authenticated
USING (
  shared_with_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR EXISTS (SELECT 1 FROM public.agenda_events e WHERE e.id = event_id AND e.created_by = auth.uid())
);

-- 4) Re-escribir políticas SELECT/UPDATE de agenda_events para incluir moderadores
DROP POLICY IF EXISTS "Admins y CEO leen agenda" ON public.agenda_events;
CREATE POLICY "Lectura agenda por rol/dueño/compartido/empresarial"
ON public.agenda_events
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR visibility = 'team'
  OR EXISTS (
    SELECT 1 FROM public.agenda_event_shares s
    WHERE s.event_id = agenda_events.id AND s.shared_with_user_id = auth.uid()
  )
);

-- INSERT: cualquier usuario autenticado con sesión puede crear su propio evento (created_by = auth.uid())
DROP POLICY IF EXISTS "Admins crean eventos agenda" ON public.agenda_events;
CREATE POLICY "Usuarios crean sus eventos agenda"
ON public.agenda_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- UPDATE: admin/ceo siempre, dueño/asignado, compartidos con can_edit=true
DROP POLICY IF EXISTS "Admins editan eventos agenda" ON public.agenda_events;
CREATE POLICY "Edición agenda por rol/dueño/compartido"
ON public.agenda_events
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.agenda_event_shares s
    WHERE s.event_id = agenda_events.id AND s.shared_with_user_id = auth.uid() AND s.can_edit = true
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.agenda_event_shares s
    WHERE s.event_id = agenda_events.id AND s.shared_with_user_id = auth.uid() AND s.can_edit = true
  )
);

-- DELETE: CEO o creador (admins ya están comprendidos en CEO/Admin? Ajustamos: CEO y Admin del rol pueden borrar)
DROP POLICY IF EXISTS "Solo CEO elimina eventos agenda" ON public.agenda_events;
CREATE POLICY "CEO/Admin/dueño eliminan eventos agenda"
ON public.agenda_events
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
);

-- 5) Asegurar que profiles sea legible por todos los autenticados (para listar compañeros de equipo)
-- (no se modifica si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Authenticated leen perfiles del equipo'
  ) THEN
    CREATE POLICY "Authenticated leen perfiles del equipo"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;