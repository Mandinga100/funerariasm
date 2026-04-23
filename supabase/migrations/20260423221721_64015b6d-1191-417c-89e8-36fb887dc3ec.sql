-- ============================================================
-- Auto-sincronización de pagos confirmados al caso
-- Recalcula service_cases.amount_paid y financial_status según
-- los payment_transactions con status='confirmed' que tengan
-- case_reference = service_cases.case_number
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_case_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_case_ref TEXT;
  v_case RECORD;
  v_paid INTEGER;
  v_new_financial TEXT;
  v_new_payment_status TEXT;
BEGIN
  v_case_ref := COALESCE(NEW.case_reference, OLD.case_reference);
  IF v_case_ref IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT id, total_amount, financial_status, payment_status
    INTO v_case
    FROM public.service_cases
   WHERE case_number = v_case_ref;

  IF v_case.id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(amount), 0)::INTEGER
    INTO v_paid
    FROM public.payment_transactions
   WHERE case_reference = v_case_ref
     AND status = 'confirmed';

  -- Estado financiero según monto pagado vs total
  IF v_case.total_amount IS NULL OR v_case.total_amount = 0 THEN
    v_new_financial := CASE WHEN v_paid > 0 THEN 'parcial' ELSE 'sin_pago' END;
    v_new_payment_status := CASE WHEN v_paid > 0 THEN 'parcial' ELSE 'pendiente' END;
  ELSIF v_paid <= 0 THEN
    v_new_financial := 'sin_pago';
    v_new_payment_status := 'pendiente';
  ELSIF v_paid >= v_case.total_amount THEN
    v_new_financial := 'pagado';
    v_new_payment_status := 'pagado';
  ELSE
    v_new_financial := 'parcial';
    v_new_payment_status := 'parcial';
  END IF;

  UPDATE public.service_cases
     SET amount_paid = v_paid,
         financial_status = v_new_financial,
         payment_status = v_new_payment_status,
         updated_at = now()
   WHERE id = v_case.id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_recalc_case_payments_ins ON public.payment_transactions;
DROP TRIGGER IF EXISTS trg_recalc_case_payments_upd ON public.payment_transactions;
DROP TRIGGER IF EXISTS trg_recalc_case_payments_del ON public.payment_transactions;

CREATE TRIGGER trg_recalc_case_payments_ins
AFTER INSERT ON public.payment_transactions
FOR EACH ROW
WHEN (NEW.case_reference IS NOT NULL)
EXECUTE FUNCTION public.recalc_case_payments();

CREATE TRIGGER trg_recalc_case_payments_upd
AFTER UPDATE OF status, amount, case_reference ON public.payment_transactions
FOR EACH ROW
WHEN (NEW.case_reference IS NOT NULL OR OLD.case_reference IS NOT NULL)
EXECUTE FUNCTION public.recalc_case_payments();

CREATE TRIGGER trg_recalc_case_payments_del
AFTER DELETE ON public.payment_transactions
FOR EACH ROW
WHEN (OLD.case_reference IS NOT NULL)
EXECUTE FUNCTION public.recalc_case_payments();

-- Re-sincronizar casos existentes
UPDATE public.service_cases sc
   SET amount_paid = COALESCE(t.paid, 0),
       financial_status = CASE
         WHEN COALESCE(t.paid, 0) <= 0 THEN 'sin_pago'
         WHEN sc.total_amount > 0 AND COALESCE(t.paid, 0) >= sc.total_amount THEN 'pagado'
         ELSE 'parcial'
       END,
       payment_status = CASE
         WHEN COALESCE(t.paid, 0) <= 0 THEN 'pendiente'
         WHEN sc.total_amount > 0 AND COALESCE(t.paid, 0) >= sc.total_amount THEN 'pagado'
         ELSE 'parcial'
       END
  FROM (
    SELECT case_reference, SUM(amount)::INTEGER AS paid
      FROM public.payment_transactions
     WHERE status = 'confirmed' AND case_reference IS NOT NULL
     GROUP BY case_reference
  ) t
 WHERE sc.case_number = t.case_reference;