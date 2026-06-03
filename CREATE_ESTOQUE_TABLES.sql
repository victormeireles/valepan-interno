-- Enum de origem do movimento
DO $$ BEGIN
  CREATE TYPE estoque_movimento_origem AS ENUM (
    'embalagem',
    'saida',
    'inventario',
    'ajuste_manual'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Saldos atuais
CREATE TABLE IF NOT EXISTS estoque_saldos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_estoque_id uuid NOT NULL REFERENCES tipos_estoque(id),
  produto_id uuid NOT NULL REFERENCES produtos(id),
  caixas integer NOT NULL DEFAULT 0,
  pacotes integer NOT NULL DEFAULT 0,
  unidades integer NOT NULL DEFAULT 0,
  kg numeric(12, 3) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo_estoque_id, produto_id)
);

CREATE INDEX IF NOT EXISTS idx_estoque_saldos_tipo ON estoque_saldos(tipo_estoque_id);

-- Ledger de auditoria
CREATE TABLE IF NOT EXISTS estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo_estoque_id uuid NOT NULL REFERENCES tipos_estoque(id),
  produto_id uuid NOT NULL REFERENCES produtos(id),
  delta_caixas integer NOT NULL DEFAULT 0,
  delta_pacotes integer NOT NULL DEFAULT 0,
  delta_unidades integer NOT NULL DEFAULT 0,
  delta_kg numeric(12, 3) NOT NULL DEFAULT 0,
  saldo_caixas integer NOT NULL DEFAULT 0,
  saldo_pacotes integer NOT NULL DEFAULT 0,
  saldo_unidades integer NOT NULL DEFAULT 0,
  saldo_kg numeric(12, 3) NOT NULL DEFAULT 0,
  origem estoque_movimento_origem NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estoque_mov_tipo_prod_data
  ON estoque_movimentos(tipo_estoque_id, produto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_created ON estoque_movimentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_origem ON estoque_movimentos(origem);

-- Inventário físico
CREATE TABLE IF NOT EXISTS inventario_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  tipo_estoque_id uuid NOT NULL REFERENCES tipos_estoque(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventario_lancamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id uuid NOT NULL REFERENCES inventario_lancamentos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES produtos(id),
  caixas integer NOT NULL DEFAULT 0,
  pacotes integer NOT NULL DEFAULT 0,
  unidades integer NOT NULL DEFAULT 0,
  kg numeric(12, 3) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_inventario_lanc_data ON inventario_lancamentos(data DESC);
