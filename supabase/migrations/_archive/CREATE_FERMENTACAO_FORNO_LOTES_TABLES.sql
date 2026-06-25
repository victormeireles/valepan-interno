-- CREATE_FERMENTACAO_FORNO_LOTES_TABLES.sql
-- Task 0: lotes de realizado de fermentação e forno (ordens de produção)
-- Aplicar no SQL Editor do Supabase antes de rodar npm run gen:types

DO $$ BEGIN
  CREATE TYPE producao_lote_modo AS ENUM ('parcial', 'substituicao');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS fermentacao_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  produzido_em timestamptz NOT NULL DEFAULT now(),
  modo producao_lote_modo NOT NULL,
  ordem_producao_id uuid NOT NULL REFERENCES ordens_producao(id) ON DELETE RESTRICT,
  assadeiras numeric(12, 3) NOT NULL DEFAULT 0,
  unidades integer NOT NULL DEFAULT 0,
  foto_url text,
  foto_id text,
  foto_uploaded_at timestamptz,
  producao_anterior jsonb
);

CREATE INDEX IF NOT EXISTS idx_fermentacao_lotes_ordem
  ON fermentacao_lotes(ordem_producao_id);

CREATE INDEX IF NOT EXISTS idx_fermentacao_lotes_produzido
  ON fermentacao_lotes(produzido_em DESC);

CREATE TABLE IF NOT EXISTS forno_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  produzido_em timestamptz NOT NULL DEFAULT now(),
  modo producao_lote_modo NOT NULL,
  ordem_producao_id uuid NOT NULL REFERENCES ordens_producao(id) ON DELETE RESTRICT,
  assadeiras numeric(12, 3) NOT NULL DEFAULT 0,
  unidades integer NOT NULL DEFAULT 0,
  foto_url text,
  foto_id text,
  foto_uploaded_at timestamptz,
  producao_anterior jsonb
);

CREATE INDEX IF NOT EXISTS idx_forno_lotes_ordem
  ON forno_lotes(ordem_producao_id);

CREATE INDEX IF NOT EXISTS idx_forno_lotes_produzido
  ON forno_lotes(produzido_em DESC);
