-- ============================================================
-- 1) CEO read access on lead_notes (consistency with contact_leads/lead_activities)
-- ============================================================
DROP POLICY IF EXISTS "CEO can read lead notes" ON public.lead_notes;
CREATE POLICY "CEO can read lead notes"
ON public.lead_notes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::app_role));

-- ============================================================
-- 2) Realtime channel authorization
-- Supabase Realtime checks RLS on realtime.messages for channel subscriptions.
-- We restrict topic access by role/ownership, scoping each channel pattern.
-- ============================================================

-- Enable RLS on realtime.messages (idempotent)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Helper notes:
--  * The current channel/topic is exposed via realtime.topic() inside policies.
--  * We allow SELECT (read broadcast) and INSERT (the authorize step) for
--    authenticated users only when the topic matches an allowed pattern.

-- Drop previous policies (idempotent re-run)
DROP POLICY IF EXISTS "realtime_admin_ceo_topics_select" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_admin_ceo_topics_insert" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_user_owned_topics_select" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_user_owned_topics_insert" ON realtime.messages;

-- ---------- Admin/CEO scoped channels ----------
-- Channel name patterns used by the app (see use-module-realtime-alerts.tsx,
-- AdminLayout, NotificationCenter, lead/case detail sheets, etc.)
-- We list the table-driven channel prefixes that broadcast sensitive PII.
CREATE POLICY "realtime_admin_ceo_topics_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role)
   OR public.has_role(auth.uid(), 'ceo'::app_role))
  AND (
    realtime.topic() LIKE 'alerts-cases-%'
    OR realtime.topic() LIKE 'alerts-agenda-%'
    OR realtime.topic() LIKE 'alerts-subs-%'
    OR realtime.topic() LIKE 'alerts-tracking-%'
    OR realtime.topic() LIKE 'alerts-payments-%'
    OR realtime.topic() LIKE 'admin-leads-%'
    OR realtime.topic() LIKE 'admin-cases-%'
    OR realtime.topic() LIKE 'admin-agenda-%'
    OR realtime.topic() LIKE 'admin-payments-%'
    OR realtime.topic() LIKE 'admin-tracking-%'
    OR realtime.topic() LIKE 'admin-subscribers-%'
    OR realtime.topic() LIKE 'admin-comuna-%'
    OR realtime.topic() LIKE 'admin-audit-%'
    OR realtime.topic() LIKE 'lead-activities-%'
    OR realtime.topic() LIKE 'case-detail-%'
    OR realtime.topic() LIKE 'agenda-detail-%'
  )
);

CREATE POLICY "realtime_admin_ceo_topics_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role)
   OR public.has_role(auth.uid(), 'ceo'::app_role))
  AND (
    realtime.topic() LIKE 'alerts-cases-%'
    OR realtime.topic() LIKE 'alerts-agenda-%'
    OR realtime.topic() LIKE 'alerts-subs-%'
    OR realtime.topic() LIKE 'alerts-tracking-%'
    OR realtime.topic() LIKE 'alerts-payments-%'
    OR realtime.topic() LIKE 'admin-leads-%'
    OR realtime.topic() LIKE 'admin-cases-%'
    OR realtime.topic() LIKE 'admin-agenda-%'
    OR realtime.topic() LIKE 'admin-payments-%'
    OR realtime.topic() LIKE 'admin-tracking-%'
    OR realtime.topic() LIKE 'admin-subscribers-%'
    OR realtime.topic() LIKE 'admin-comuna-%'
    OR realtime.topic() LIKE 'admin-audit-%'
    OR realtime.topic() LIKE 'lead-activities-%'
    OR realtime.topic() LIKE 'case-detail-%'
    OR realtime.topic() LIKE 'agenda-detail-%'
  )
);

-- ---------- Per-user owned channels (notifications + prefs) ----------
-- The user's own notification channel uses the user_id as a suffix:
--   notifications-<user_id>, notif-prefs-<user_id>
CREATE POLICY "realtime_user_owned_topics_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('notifications-' || auth.uid()::text)
  OR realtime.topic() = ('notif-prefs-' || auth.uid()::text)
  OR realtime.topic() LIKE ('notifications-' || auth.uid()::text || '-%')
  OR realtime.topic() LIKE ('notif-prefs-' || auth.uid()::text || '-%')
);

CREATE POLICY "realtime_user_owned_topics_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('notifications-' || auth.uid()::text)
  OR realtime.topic() = ('notif-prefs-' || auth.uid()::text)
  OR realtime.topic() LIKE ('notifications-' || auth.uid()::text || '-%')
  OR realtime.topic() LIKE ('notif-prefs-' || auth.uid()::text || '-%')
);
