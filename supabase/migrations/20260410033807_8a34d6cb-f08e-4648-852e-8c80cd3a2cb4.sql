
-- Add CRM columns to contact_leads
ALTER TABLE public.contact_leads
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'nuevo',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS estimated_value integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_follow_up timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_classification jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamp with time zone;

-- Create lead_notes table
CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.contact_leads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'nota',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lead notes"
  ON public.lead_notes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create lead_activities table
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.contact_leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  performed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lead activities"
  ON public.lead_activities FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  reference_id uuid,
  reference_type text,
  read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
  ON public.admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;

-- Create indexes
CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_admin_notifications_user_id ON public.admin_notifications(user_id);
CREATE INDEX idx_contact_leads_pipeline_stage ON public.contact_leads(pipeline_stage);
CREATE INDEX idx_contact_leads_next_follow_up ON public.contact_leads(next_follow_up);

-- Function to auto-create activity on lead status change
CREATE OR REPLACE FUNCTION public.log_lead_pipeline_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO public.lead_activities (lead_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      'pipeline_change',
      'Cambió de "' || COALESCE(OLD.pipeline_stage, 'sin etapa') || '" a "' || NEW.pipeline_stage || '"',
      jsonb_build_object('old_stage', OLD.pipeline_stage, 'new_stage', NEW.pipeline_stage)
    );
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_activities (lead_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      'status_change',
      'Estado cambió a "' || NEW.status || '"',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_update_log_activity
  AFTER UPDATE ON public.contact_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_pipeline_change();
