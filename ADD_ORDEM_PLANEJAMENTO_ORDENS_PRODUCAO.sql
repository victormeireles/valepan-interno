-- Ordem de produção no planejamento (1 = primeiro pão a produzir).
-- Execute no SQL Editor do Supabase (ou via migration) antes de usar a fila com arrastar.

ALTER TABLE public.ordens_producao
  ADD COLUMN IF NOT EXISTS ordem_planejamento integer;

COMMENT ON COLUMN public.ordens_producao.ordem_planejamento IS
  'Sequência no planejamento; menor = produzir antes. Arrastar na fila atualiza.';

CREATE INDEX IF NOT EXISTS idx_ordens_producao_ordem_planejamento
  ON public.ordens_producao (ordem_planejamento)
  WHERE status = 'planejado';
