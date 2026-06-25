-- CREATE_EMBALAGEM_LOTES_TABLES.sql
-- Fase B.1: lotes de realizado de embalagem + FK em estoque_movimentos
-- Aplicar no SQL Editor do Supabase antes de rodar npm run gen:types

DO $$ BEGIN
  CREATE TYPE embalagem_lote_modo AS ENUM ('parcial', 'substituicao', 'importado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS embalagem_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  produzido_em timestamptz NOT NULL DEFAULT now(),
  modo embalagem_lote_modo NOT NULL,
  pedido_embalagem_id uuid,
  data_pedido date NOT NULL,
  data_fabricacao date NOT NULL,
  tipo_estoque_id uuid NOT NULL REFERENCES tipos_estoque(id),
  produto_id uuid NOT NULL REFERENCES produtos(id),
  congelado text NOT NULL DEFAULT 'Não',
  lote integer,
  caixas integer NOT NULL DEFAULT 0,
  pacotes integer NOT NULL DEFAULT 0,
  unidades integer NOT NULL DEFAULT 0,
  kg numeric(12, 3) NOT NULL DEFAULT 0,
  obs_embalagem text,
  pacote_foto_url text,
  pacote_foto_id text,
  pacote_foto_uploaded_at timestamptz,
  etiqueta_foto_url text,
  etiqueta_foto_id text,
  etiqueta_foto_uploaded_at timestamptz,
  pallet_foto_url text,
  pallet_foto_id text,
  pallet_foto_uploaded_at timestamptz,
  producao_anterior jsonb
);

CREATE INDEX IF NOT EXISTS idx_embalagem_lotes_data_pedido
  ON embalagem_lotes(data_pedido DESC);

CREATE INDEX IF NOT EXISTS idx_embalagem_lotes_tipo_prod_produzido
  ON embalagem_lotes(tipo_estoque_id, produto_id, produzido_em DESC);

ALTER TABLE estoque_movimentos
  ADD COLUMN IF NOT EXISTS embalagem_lote_id uuid REFERENCES embalagem_lotes(id);

CREATE INDEX IF NOT EXISTS idx_estoque_mov_embalagem_lote
  ON estoque_movimentos(embalagem_lote_id)
  WHERE embalagem_lote_id IS NOT NULL;
