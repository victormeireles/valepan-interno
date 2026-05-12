-- =============================================================================
-- Migração oficial unificada: ordem de produção diária + vínculo OP (interno)
-- Pré-requisito: interno.set_updated_at() e tabela interno.ordens_producao.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Ordem diária: cabeçalho + itens
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS interno.ordens_producao_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_producao date NOT NULL,
  data_etiqueta_default date NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'pronto', 'em_producao', 'concluido')
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ordens_producao_diarias_data_unique UNIQUE (data_producao)
);

CREATE TABLE IF NOT EXISTS interno.ordens_producao_diarias_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_diaria_id uuid NOT NULL REFERENCES interno.ordens_producao_diarias (id) ON DELETE CASCADE,
  prioridade integer NOT NULL DEFAULT 1,
  produto_id uuid NOT NULL REFERENCES interno.produtos (id),
  tipo_lata text NOT NULL CHECK (tipo_lata IN ('antiga', 'nova', 'outra')),
  latas_planejadas integer NOT NULL DEFAULT 0,
  caixas_estimadas integer NOT NULL DEFAULT 0,
  clientes jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_producao_override date,
  data_etiqueta_override date,
  observacao text,
  status_linha text NOT NULL DEFAULT 'rascunho' CHECK (
    status_linha IN ('rascunho', 'pronto', 'em_producao', 'concluido')
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ordens_producao_diarias_itens_latas_nn CHECK (latas_planejadas >= 0),
  CONSTRAINT ordens_producao_diarias_itens_caixas_nn CHECK (caixas_estimadas >= 0)
);

-- Vínculo cada linha da ordem diária ↔ OP operacional (decisão aprovada)
ALTER TABLE interno.ordens_producao_diarias_itens
  ADD COLUMN IF NOT EXISTS ordens_producao_id uuid NULL
    REFERENCES interno.ordens_producao (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS ordens_producao_diarias_itens_op_id_idx
  ON interno.ordens_producao_diarias_itens (ordens_producao_id)
  WHERE ordens_producao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ordens_producao_diarias_itens_ordem_prioridade_idx
  ON interno.ordens_producao_diarias_itens (ordem_diaria_id, prioridade);

COMMENT ON COLUMN interno.ordens_producao_diarias_itens.ordens_producao_id IS
  'OP operacional criada ao gravar a linha; remoção de linha cancela a OP, não apaga.';

DROP TRIGGER IF EXISTS trg_ordens_producao_diarias_set_updated_at ON interno.ordens_producao_diarias;
CREATE TRIGGER trg_ordens_producao_diarias_set_updated_at
  BEFORE UPDATE ON interno.ordens_producao_diarias
  FOR EACH ROW
  EXECUTE PROCEDURE interno.set_updated_at();

DROP TRIGGER IF EXISTS trg_ordens_producao_diarias_itens_set_updated_at ON interno.ordens_producao_diarias_itens;
CREATE TRIGGER trg_ordens_producao_diarias_itens_set_updated_at
  BEFORE UPDATE ON interno.ordens_producao_diarias_itens
  FOR EACH ROW
  EXECUTE PROCEDURE interno.set_updated_at();

COMMENT ON TABLE interno.ordens_producao_diarias IS 'Cabeçalho da ordem de producao planejada por dia.';
COMMENT ON TABLE interno.ordens_producao_diarias_itens IS 'Linhas da ordem diaria; cada linha gravada liga-se a interno.ordens_producao.';

-- ---------------------------------------------------------------------------
-- 2) Colunas em ordens_producao usadas pelo planejamento / fila (idempotente)
-- ---------------------------------------------------------------------------

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS ordem_planejamento integer;

COMMENT ON COLUMN interno.ordens_producao.ordem_planejamento IS
  'Sequência no planejamento; menor = produzir antes. Sincronizar com prioridade da linha diária.';

CREATE INDEX IF NOT EXISTS idx_ordens_producao_ordem_planejamento
  ON interno.ordens_producao (ordem_planejamento)
  WHERE status = 'planejado';

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS assadeira_id uuid NULL
    REFERENCES interno.assadeiras (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ordens_producao_assadeira_id_idx
  ON interno.ordens_producao (assadeira_id)
  WHERE assadeira_id IS NOT NULL;

COMMENT ON COLUMN interno.ordens_producao.assadeira_id IS
  'Assadeira (tipo de lata); alinhada ao tipo_lata da linha diária. NULL = inferir pelo cadastro produto_assadeiras.';

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS temporaria boolean NOT NULL DEFAULT false;

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS temporaria_expira_em date NULL;

COMMENT ON COLUMN interno.ordens_producao.temporaria IS
  'Ordem só para teste; a aplicação remove o registo após o dia em temporaria_expira_em (fuso Brasília).';

COMMENT ON COLUMN interno.ordens_producao.temporaria_expira_em IS
  'Último dia civil (BR) em que a OP temporária existe.';

-- ---------------------------------------------------------------------------
-- 3) RLS (políticas alinhadas ao script diário original)
-- ---------------------------------------------------------------------------

ALTER TABLE interno.ordens_producao_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE interno.ordens_producao_diarias_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ordens_producao_diarias_select_authenticated" ON interno.ordens_producao_diarias;
CREATE POLICY "ordens_producao_diarias_select_authenticated"
  ON interno.ordens_producao_diarias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ordens_producao_diarias_insert_admin" ON interno.ordens_producao_diarias;
CREATE POLICY "ordens_producao_diarias_insert_admin"
  ON interno.ordens_producao_diarias FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_update_admin" ON interno.ordens_producao_diarias;
CREATE POLICY "ordens_producao_diarias_update_admin"
  ON interno.ordens_producao_diarias FOR UPDATE TO authenticated
  USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_delete_admin" ON interno.ordens_producao_diarias;
CREATE POLICY "ordens_producao_diarias_delete_admin"
  ON interno.ordens_producao_diarias FOR DELETE TO authenticated
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_itens_select_authenticated" ON interno.ordens_producao_diarias_itens;
CREATE POLICY "ordens_producao_diarias_itens_select_authenticated"
  ON interno.ordens_producao_diarias_itens FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ordens_producao_diarias_itens_insert_admin" ON interno.ordens_producao_diarias_itens;
CREATE POLICY "ordens_producao_diarias_itens_insert_admin"
  ON interno.ordens_producao_diarias_itens FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_itens_update_admin" ON interno.ordens_producao_diarias_itens;
CREATE POLICY "ordens_producao_diarias_itens_update_admin"
  ON interno.ordens_producao_diarias_itens FOR UPDATE TO authenticated
  USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_itens_delete_admin" ON interno.ordens_producao_diarias_itens;
CREATE POLICY "ordens_producao_diarias_itens_delete_admin"
  ON interno.ordens_producao_diarias_itens FOR DELETE TO authenticated
  USING ((SELECT is_admin()));
