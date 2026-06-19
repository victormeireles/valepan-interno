-- Enums
DO $$ BEGIN
  CREATE TYPE insumo_movimento_origem AS ENUM (
    'entrada_nf',
    'ajuste_manual',
    'resolucao_pendencia'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE insumo_pendencia_status AS ENUM (
    'pendente',
    'resolvido',
    'ignorado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mapeamento Omie → insumo
CREATE TABLE IF NOT EXISTS integracao_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  omie_id_produto bigint NOT NULL,
  omie_codigo_produto text,
  insumo_id uuid NOT NULL REFERENCES insumos(id),
  fator_conversao numeric(14, 6) NOT NULL DEFAULT 1 CHECK (fator_conversao > 0),
  descricao_omie text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, omie_id_produto)
);

CREATE INDEX IF NOT EXISTS idx_integracao_insumos_insumo
  ON integracao_insumos(insumo_id);

-- Snapshot de saldo
CREATE TABLE IF NOT EXISTS insumo_saldos (
  insumo_id uuid PRIMARY KEY REFERENCES insumos(id) ON DELETE CASCADE,
  quantidade numeric(14, 3) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ledger
CREATE TABLE IF NOT EXISTS insumo_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  insumo_id uuid NOT NULL REFERENCES insumos(id),
  empresa_id uuid REFERENCES empresas(id),
  delta_quantidade numeric(14, 3) NOT NULL,
  saldo_resultante numeric(14, 3) NOT NULL CHECK (saldo_resultante >= 0),
  custo_unitario numeric(14, 6) NOT NULL DEFAULT 0,
  origem insumo_movimento_origem NOT NULL,
  omie_n_id_receb bigint,
  omie_n_id_item bigint,
  omie_webhook_evento_id uuid REFERENCES omie_webhook_eventos(id),
  pendencia_id uuid,
  observacao text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insumo_mov_entrada_nf_idempotencia
  ON insumo_movimentos (empresa_id, omie_n_id_receb, omie_n_id_item)
  WHERE origem = 'entrada_nf'
    AND empresa_id IS NOT NULL
    AND omie_n_id_receb IS NOT NULL
    AND omie_n_id_item IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_insumo_mov_insumo_data
  ON insumo_movimentos(insumo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insumo_mov_origem ON insumo_movimentos(origem);
CREATE INDEX IF NOT EXISTS idx_insumo_mov_created ON insumo_movimentos(created_at DESC);

-- Pendências
CREATE TABLE IF NOT EXISTS insumo_entrada_pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  omie_webhook_evento_id uuid REFERENCES omie_webhook_eventos(id),
  omie_n_id_receb bigint NOT NULL,
  omie_n_id_item bigint NOT NULL,
  omie_id_produto bigint NOT NULL,
  omie_codigo_produto text,
  descricao_produto text,
  quantidade_nf numeric(14, 3) NOT NULL,
  unidade_nf text,
  preco_unit_nf numeric(14, 6),
  valor_total_item numeric(14, 2) NOT NULL,
  numero_nf text,
  data_emissao_nf date,
  status insumo_pendencia_status NOT NULL DEFAULT 'pendente',
  integracao_insumo_id uuid REFERENCES integracao_insumos(id),
  resolvido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, omie_n_id_receb, omie_n_id_item)
);

CREATE INDEX IF NOT EXISTS idx_insumo_pend_status
  ON insumo_entrada_pendencias(status) WHERE status = 'pendente';

-- FK pendencia em movimentos (após criar pendencias)
ALTER TABLE insumo_movimentos
  DROP CONSTRAINT IF EXISTS insumo_movimentos_pendencia_id_fkey;
ALTER TABLE insumo_movimentos
  ADD CONSTRAINT insumo_movimentos_pendencia_id_fkey
  FOREIGN KEY (pendencia_id) REFERENCES insumo_entrada_pendencias(id);

-- RLS
ALTER TABLE integracao_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo_saldos ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo_entrada_pendencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY integracao_insumos_select ON integracao_insumos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY integracao_insumos_insert ON integracao_insumos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY integracao_insumos_update ON integracao_insumos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY integracao_insumos_delete ON integracao_insumos
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

CREATE POLICY insumo_saldos_select ON insumo_saldos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insumo_saldos_insert ON insumo_saldos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY insumo_saldos_update ON insumo_saldos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY insumo_saldos_delete ON insumo_saldos
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

CREATE POLICY insumo_movimentos_select ON insumo_movimentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insumo_movimentos_insert ON insumo_movimentos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY insumo_movimentos_update ON insumo_movimentos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY insumo_movimentos_delete ON insumo_movimentos
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

CREATE POLICY insumo_entrada_pendencias_select ON insumo_entrada_pendencias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insumo_entrada_pendencias_insert ON insumo_entrada_pendencias
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY insumo_entrada_pendencias_update ON insumo_entrada_pendencias
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY insumo_entrada_pendencias_delete ON insumo_entrada_pendencias
  FOR DELETE TO authenticated USING ((SELECT is_admin()));
