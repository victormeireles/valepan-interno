-- ALTER_ORDENS_PRODUCAO_ETAPA_META.sql
-- Meta em cascata entre etapas: colunas de finalização por etapa em ordens_producao
-- (fermentação, forno, embalagem — flag finalizada, meta confirmada e timestamp).
-- Aplicar no SQL Editor do Supabase antes de rodar npm run gen:types

ALTER TABLE ordens_producao
  ADD COLUMN IF NOT EXISTS fermentacao_finalizada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fermentacao_meta_confirmada numeric(12,3),
  ADD COLUMN IF NOT EXISTS fermentacao_finalizada_em timestamptz,
  ADD COLUMN IF NOT EXISTS forno_finalizada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forno_meta_confirmada numeric(12,3),
  ADD COLUMN IF NOT EXISTS forno_finalizada_em timestamptz,
  ADD COLUMN IF NOT EXISTS embalagem_finalizada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS embalagem_meta_confirmada integer,
  ADD COLUMN IF NOT EXISTS embalagem_finalizada_em timestamptz;
