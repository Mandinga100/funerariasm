-- 1. Secuencia para correlativos de caso
CREATE SEQUENCE IF NOT EXISTS public.service_cases_case_number_seq
  AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;

-- 2. Renumerar casos existentes por orden cronológico (created_at, luego id como tie-breaker)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.service_cases
)
UPDATE public.service_cases sc
SET case_number = 'CASO-' || LPAD(o.rn::text, 3, '0')
FROM ordered o
WHERE sc.id = o.id;

-- 3. Avanzar la secuencia al máximo correlativo usado
SELECT setval(
  'public.service_cases_case_number_seq',
  GREATEST(
    (SELECT COALESCE(MAX(NULLIF(regexp_replace(case_number, '\D', '', 'g'), '')::bigint), 0)
       FROM public.service_cases),
    1
  ),
  true
);

-- 4. Cambiar el default para usar la secuencia con padding de 3 dígitos
ALTER TABLE public.service_cases
  ALTER COLUMN case_number
  SET DEFAULT ('CASO-' || LPAD(nextval('public.service_cases_case_number_seq')::text, 3, '0'));

-- 5. Garantizar unicidad del case_number
CREATE UNIQUE INDEX IF NOT EXISTS service_cases_case_number_unique
  ON public.service_cases (case_number);