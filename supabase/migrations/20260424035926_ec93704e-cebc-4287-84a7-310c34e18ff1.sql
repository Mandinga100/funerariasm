-- ============================================================
-- BLOQUE #9: Chat conversacional con handoff humano
-- ============================================================

-- 1) TABLA: chat_conversations
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_token TEXT NOT NULL UNIQUE,
  -- Vínculos CRM (FK lógica, sin cascade para no romper convos al borrar leads/casos)
  lead_id UUID REFERENCES public.contact_leads(id) ON DELETE SET NULL,
  service_case_id UUID REFERENCES public.service_cases(id) ON DELETE SET NULL,
  -- Datos visitante
  visitor_name TEXT,
  visitor_phone TEXT,
  visitor_email TEXT,
  channel TEXT NOT NULL DEFAULT 'web',
  -- Estado y asignación
  status TEXT NOT NULL DEFAULT 'bot',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID,
  -- Contadores
  unread_admin INTEGER NOT NULL DEFAULT 0,
  unread_visitor INTEGER NOT NULL DEFAULT 0,
  -- SLA
  sla_due_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Constraints
  CONSTRAINT chat_conv_status_check CHECK (status IN ('bot','pendiente_humano','humano_activo','cerrado')),
  CONSTRAINT chat_conv_priority_check CHECK (priority IN ('baja','normal','alta','urgente')),
  CONSTRAINT chat_conv_channel_check CHECK (channel IN ('web','whatsapp_export'))
);

CREATE INDEX idx_chat_conv_status ON public.chat_conversations(status);
CREATE INDEX idx_chat_conv_assigned ON public.chat_conversations(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_chat_conv_lead ON public.chat_conversations(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_chat_conv_case ON public.chat_conversations(service_case_id) WHERE service_case_id IS NOT NULL;
CREATE INDEX idx_chat_conv_last_message ON public.chat_conversations(last_message_at DESC);
CREATE INDEX idx_chat_conv_token ON public.chat_conversations(conversation_token);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y CEO leen conversaciones"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admins gestionan conversaciones"
  ON public.chat_conversations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- 2) TABLA: chat_messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_user_id UUID,
  content TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_mime TEXT,
  voice_url TEXT,
  voice_duration_seconds INTEGER,
  read_by_admin_at TIMESTAMP WITH TIME ZONE,
  read_by_visitor_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT chat_msg_sender_check CHECK (sender_type IN ('visitor','bot','admin','system')),
  CONSTRAINT chat_msg_content_len CHECK (length(content) <= 8000)
);

CREATE INDEX idx_chat_msg_conv ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_msg_sender ON public.chat_messages(sender_type);
CREATE INDEX idx_chat_msg_unread_admin ON public.chat_messages(conversation_id) WHERE read_by_admin_at IS NULL AND sender_type = 'visitor';

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y CEO leen mensajes"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Admins gestionan mensajes"
  ON public.chat_messages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- 3) TRIGGER updated_at
CREATE TRIGGER trg_chat_conv_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) FUNCIÓN + TRIGGER: actualizar contadores y notificar
CREATE OR REPLACE FUNCTION public.handle_chat_message_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv RECORD;
  admin_record RECORD;
BEGIN
  -- Refrescar last_message_at + contadores
  IF NEW.sender_type = 'visitor' THEN
    UPDATE public.chat_conversations
       SET last_message_at = NEW.created_at,
           unread_admin = unread_admin + 1,
           updated_at = now()
     WHERE id = NEW.conversation_id
     RETURNING * INTO v_conv;
  ELSIF NEW.sender_type IN ('admin','bot') AND NOT NEW.is_internal_note THEN
    UPDATE public.chat_conversations
       SET last_message_at = NEW.created_at,
           unread_visitor = unread_visitor + 1,
           updated_at = now()
     WHERE id = NEW.conversation_id
     RETURNING * INTO v_conv;
  ELSE
    UPDATE public.chat_conversations
       SET last_message_at = NEW.created_at,
           updated_at = now()
     WHERE id = NEW.conversation_id
     RETURNING * INTO v_conv;
  END IF;

  -- Notificar a admins solo si llega visitor msg en convo pendiente o asignada
  IF NEW.sender_type = 'visitor' AND v_conv.status IN ('pendiente_humano','humano_activo') THEN
    IF v_conv.assigned_to IS NOT NULL THEN
      INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
      VALUES (
        v_conv.assigned_to,
        '💬 Nuevo mensaje en chat',
        COALESCE(v_conv.visitor_name, 'Visitante') || ': ' || left(NEW.content, 120),
        CASE WHEN v_conv.priority IN ('alta','urgente') THEN 'urgent' ELSE 'info' END,
        v_conv.id,
        'chat_conversation'
      );
    ELSE
      -- Sin asignar: avisar a todos los admins/CEO
      FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','ceo')
      LOOP
        INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
          admin_record.user_id,
          '💬 Chat sin asignar',
          COALESCE(v_conv.visitor_name, 'Visitante') || ': ' || left(NEW.content, 120),
          CASE WHEN v_conv.priority IN ('alta','urgente') THEN 'urgent' ELSE 'info' END,
          v_conv.id,
          'chat_conversation'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_message_after_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_chat_message_after_insert();

-- 5) FUNCIÓN + TRIGGER: handoff bot→humano dispara fanout
CREATE OR REPLACE FUNCTION public.handle_chat_conversation_handoff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  v_emoji TEXT;
  v_type TEXT;
BEGIN
  IF NEW.status = 'pendiente_humano' AND OLD.status IS DISTINCT FROM 'pendiente_humano' THEN
    v_emoji := CASE WHEN NEW.priority = 'urgente' THEN '🚨' WHEN NEW.priority = 'alta' THEN '⚠️' ELSE '🙋' END;
    v_type  := CASE WHEN NEW.priority IN ('alta','urgente') THEN 'urgent' ELSE 'new_lead' END;
    FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','ceo')
    LOOP
      INSERT INTO public.admin_notifications (user_id, title, message, type, reference_id, reference_type)
      VALUES (
        admin_record.user_id,
        v_emoji || ' Visitante solicita asesor',
        COALESCE(NEW.visitor_name, 'Visitante') || ' (' || COALESCE(NEW.visitor_phone, NEW.visitor_email, 'sin contacto') || ') espera respuesta humana',
        v_type,
        NEW.id,
        'chat_handoff'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_conv_handoff
  AFTER UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_chat_conversation_handoff();

-- 6) STORAGE: bucket privado chat-attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf','audio/webm','audio/mpeg','audio/mp4','audio/ogg','audio/wav']
);

CREATE POLICY "Admins leen chat-attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-attachments' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)));

CREATE POLICY "Admins suben chat-attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)));

CREATE POLICY "Admins actualizan chat-attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'chat-attachments' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)));

CREATE POLICY "CEO elimina chat-attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-attachments' AND has_role(auth.uid(),'ceo'::app_role));

-- 7) REALTIME publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;