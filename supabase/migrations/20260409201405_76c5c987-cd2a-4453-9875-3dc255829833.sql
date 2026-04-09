
-- Payment transactions table
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_ref text NOT NULL DEFAULT 'TXN-' || substr(md5(random()::text || now()::text), 1, 12),
  payment_type text NOT NULL CHECK (payment_type IN ('servicio', 'planificacion', 'donacion')),
  payment_subtype text,
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('draft','initiated','bank_details_viewed','transfer_reported','proof_uploaded','pending_review','confirmed','rejected','suspicious','duplicate')),
  
  -- Payer info
  full_name text NOT NULL,
  rut text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  
  -- Payment details
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'CLP',
  plan_id text,
  plan_name text,
  service_description text,
  case_reference text,
  
  -- Donation specific
  donor_display_name text,
  is_anonymous boolean DEFAULT false,
  memorial_id uuid REFERENCES public.memorials(id),
  donor_message text,
  
  -- Proof
  proof_url text,
  proof_filename text,
  
  -- Anti-fraud & audit
  ip_address text,
  user_agent text,
  honeypot_triggered boolean DEFAULT false,
  fraud_flags text[] DEFAULT '{}',
  form_loaded_at timestamptz,
  form_submitted_at timestamptz DEFAULT now(),
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Anyone can create a payment transaction (anon submits the form)
CREATE POLICY "Anyone can submit payment notifications"
  ON public.payment_transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated (admin) can read
CREATE POLICY "Authenticated can read payment transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update status
CREATE POLICY "Admins can update payment transactions"
  ON public.payment_transactions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- Anyone can upload proofs
CREATE POLICY "Anyone can upload payment proofs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

-- Only authenticated can view proofs
CREATE POLICY "Authenticated can view payment proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs');
