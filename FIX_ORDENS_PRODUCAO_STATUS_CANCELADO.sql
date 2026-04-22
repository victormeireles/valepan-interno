-- Corrige exclusão de OP no planejamento: a app grava status = 'cancelado'.
-- Se o CHECK da coluna status não incluir 'cancelado', o Postgres devolve erro 23514.
--
-- Antes de executar no SQL Editor do Supabase:
--   SELECT DISTINCT status FROM public.ordens_producao ORDER BY 1;
-- Se aparecer algum valor fora da lista abaixo, acrescente-o no IN (...).
--
-- Se o nome da constraint for outro, ajuste o DROP (ou use o SELECT):
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.ordens_producao'::regclass AND contype = 'c';

ALTER TABLE public.ordens_producao
  DROP CONSTRAINT IF EXISTS ordens_producao_status_check;

ALTER TABLE public.ordens_producao
  ADD CONSTRAINT ordens_producao_status_check CHECK (
    status IS NULL
    OR status IN (
      'planejado',
      'massa',
      'fermentacao',
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
      'saida_embalagem',
      'concluido',
      'cancelado'
    )
  );
