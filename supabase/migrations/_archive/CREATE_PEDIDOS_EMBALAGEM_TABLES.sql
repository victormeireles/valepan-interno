-- CREATE_PEDIDOS_EMBALAGEM_TABLES.sql
-- Fase B.2: meta de pedido de embalagem (agregado canônico)
-- Aplicar no SQL Editor do Supabase antes de rodar npm run gen:types

CREATE TABLE IF NOT EXISTS pedidos_embalagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  data_producao date NOT NULL,
  data_fabricacao_etiqueta date NOT NULL,
  tipo_estoque_id uuid NOT NULL REFERENCES tipos_estoque(id),
  produto_id uuid NOT NULL REFERENCES produtos(id),
  observacao text NOT NULL DEFAULT '',
  caixas integer NOT NULL DEFAULT 0,
  pacotes integer NOT NULL DEFAULT 0,
  unidades integer NOT NULL DEFAULT 0,
  kg numeric(12, 3) NOT NULL DEFAULT 0,
  CONSTRAINT pedidos_embalagem_chave_natural UNIQUE (
    data_producao,
    data_fabricacao_etiqueta,
    tipo_estoque_id,
    produto_id,
    observacao
  )
);

CREATE INDEX IF NOT EXISTS idx_pedidos_embalagem_data_producao
  ON pedidos_embalagem(data_producao DESC);
