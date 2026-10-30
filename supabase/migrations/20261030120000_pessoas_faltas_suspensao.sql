-- Suspensão é classificação da falta: dia em que a pessoa falta porque está suspensa.
-- Não entra em justificada nem em injustificada.
-- A medida disciplinar "suspensao" continua válida só em falta injustificada.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pessoas_faltas'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%classificacao%'
      AND pg_get_constraintdef(con.oid) ILIKE '%injustificada%'
  LOOP
    EXECUTE format('ALTER TABLE public.pessoas_faltas DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.pessoas_faltas
  DROP CONSTRAINT IF EXISTS pessoas_faltas_classificacao_check;

ALTER TABLE public.pessoas_faltas
  ADD CONSTRAINT pessoas_faltas_classificacao_check
  CHECK (classificacao IN ('pendente', 'justificada', 'injustificada', 'suspensao'));
