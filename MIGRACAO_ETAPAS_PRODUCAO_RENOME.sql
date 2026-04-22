-- Renomeia valores de etapa em producao_etapas_log e status em ordens_producao:
--   forno → entrada_forno
--   embalagem → entrada_embalagem
-- Inclui saida_forno e saida_embalagem na constraint CHECK (se ainda não existirem).
--
-- Execute no SQL Editor do Supabase (projeto correto). Idempotente parcial: os UPDATEs
-- não alteram linhas já migradas.

-- 1) Dados existentes
UPDATE public.producao_etapas_log SET etapa = 'entrada_forno' WHERE etapa = 'forno';
UPDATE public.producao_etapas_log SET etapa = 'entrada_embalagem' WHERE etapa = 'embalagem';

UPDATE public.ordens_producao SET status = 'entrada_forno' WHERE status = 'forno';
UPDATE public.ordens_producao SET status = 'entrada_embalagem' WHERE status = 'embalagem';

-- 2) Constraint em producao_etapas_log.etapa
ALTER TABLE public.producao_etapas_log
  DROP CONSTRAINT IF EXISTS producao_etapas_log_etapa_check;

ALTER TABLE public.producao_etapas_log
  ADD CONSTRAINT producao_etapas_log_etapa_check
  CHECK (
    etapa IN (
      'massa',
      'fermentacao',
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
      'saida_embalagem'
    )
  );

-- 3) Se ordens_producao.status tiver CHECK com nomes antigos, ajuste manualmente
-- (rode no banco:)
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.ordens_producao'::regclass AND contype = 'c';
