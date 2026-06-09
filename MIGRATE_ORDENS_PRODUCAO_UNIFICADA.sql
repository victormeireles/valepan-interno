-- MIGRATE_ORDENS_PRODUCAO_UNIFICADA.sql
-- Fase D.1: unificação canônica pedidos_embalagem → ordens_producao
-- Aplicar no SQL Editor do Supabase antes de rodar npm run gen:types
--
-- IMPORTANTE: não execute npm run gen:types até esta migration estar aplicada no Supabase.

-- 1. assadeiras: rename + nullable
ALTER TABLE assadeiras
  RENAME COLUMN numero_buracos TO unidades_por_assadeira;

ALTER TABLE assadeiras
  ALTER COLUMN unidades_por_assadeira DROP NOT NULL;

-- 2. produto_assadeiras: nullable override
ALTER TABLE produto_assadeiras
  ALTER COLUMN unidades_por_assadeira DROP NOT NULL;

-- 3. isolate legacy ordens_producao
ALTER TABLE IF EXISTS ordens_producao RENAME TO _ordens_producao_legacy;

-- 4. pedidos_embalagem → ordens_producao
ALTER TABLE pedidos_embalagem RENAME TO ordens_producao;

-- 5. new columns (assadeira_id nullable temporarily for backfill)
ALTER TABLE ordens_producao
  ADD COLUMN IF NOT EXISTS assadeira_id uuid REFERENCES assadeiras(id),
  ADD COLUMN IF NOT EXISTS assadeiras numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ordem_planejamento integer NOT NULL DEFAULT 0;

-- 6. replace unique constraint
ALTER TABLE ordens_producao
  DROP CONSTRAINT IF EXISTS pedidos_embalagem_chave_natural;

DO $$ BEGIN
  ALTER TABLE ordens_producao
    ADD CONSTRAINT ordens_producao_chave_natural UNIQUE (
      data_producao,
      data_fabricacao_etiqueta,
      tipo_estoque_id,
      produto_id,
      observacao,
      assadeira_id
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ordens_producao_data_ordem
  ON ordens_producao(data_producao DESC, ordem_planejamento);

-- 7. embalagem_lotes FK rename
ALTER TABLE embalagem_lotes
  RENAME COLUMN pedido_embalagem_id TO ordem_producao_id;

ALTER TABLE embalagem_lotes
  DROP CONSTRAINT IF EXISTS embalagem_lotes_pedido_embalagem_id_fkey;

DO $$ BEGIN
  ALTER TABLE embalagem_lotes
    ADD CONSTRAINT embalagem_lotes_ordem_producao_id_fkey
    FOREIGN KEY (ordem_producao_id) REFERENCES ordens_producao(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
