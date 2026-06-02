-- =============================================================================
-- Tipos de caixa por cliente + overrides (produto × tipo) + ordem diária
-- Pré-requisito: interno.set_updated_at(), interno.clientes, interno.produtos,
--   interno.ordens_producao_diarias_itens, função is_admin() (mesmo padrão da ordem diária).
-- =============================================================================

CREATE TABLE IF NOT EXISTS interno.tipos_caixa_embalagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES interno.clientes (id) ON DELETE RESTRICT,
  nome text NOT NULL,
  unidades_por_caixa integer NOT NULL CHECK (unidades_por_caixa > 0),
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tipos_caixa_embalagem_cliente_nome_unique UNIQUE (cliente_id, nome)
);

CREATE INDEX IF NOT EXISTS tipos_caixa_embalagem_cliente_idx
  ON interno.tipos_caixa_embalagem (cliente_id);

DROP TRIGGER IF EXISTS trg_tipos_caixa_embalagem_set_updated_at ON interno.tipos_caixa_embalagem;
CREATE TRIGGER trg_tipos_caixa_embalagem_set_updated_at
  BEFORE UPDATE ON interno.tipos_caixa_embalagem
  FOR EACH ROW
  EXECUTE PROCEDURE interno.set_updated_at();

COMMENT ON TABLE interno.tipos_caixa_embalagem IS
  'Modelo de caixa por cliente (ex.: caixa específica Damião com N unidades de pão por caixa).';

CREATE TABLE IF NOT EXISTS interno.produtos_tipos_caixa_embalagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES interno.produtos (id) ON DELETE CASCADE,
  tipo_caixa_embalagem_id uuid NOT NULL REFERENCES interno.tipos_caixa_embalagem (id) ON DELETE CASCADE,
  box_units_override integer NULL CHECK (box_units_override IS NULL OR box_units_override > 0),
  package_units_override integer NULL CHECK (package_units_override IS NULL OR package_units_override > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT produtos_tipos_caixa_embalagem_unique UNIQUE (produto_id, tipo_caixa_embalagem_id)
);

CREATE INDEX IF NOT EXISTS produtos_tipos_caixa_embalagem_produto_idx
  ON interno.produtos_tipos_caixa_embalagem (produto_id);

CREATE INDEX IF NOT EXISTS produtos_tipos_caixa_embalagem_tipo_idx
  ON interno.produtos_tipos_caixa_embalagem (tipo_caixa_embalagem_id);

DROP TRIGGER IF EXISTS trg_produtos_tipos_caixa_embalagem_set_updated_at ON interno.produtos_tipos_caixa_embalagem;
CREATE TRIGGER trg_produtos_tipos_caixa_embalagem_set_updated_at
  BEFORE UPDATE ON interno.produtos_tipos_caixa_embalagem
  FOR EACH ROW
  EXECUTE PROCEDURE interno.set_updated_at();

COMMENT ON TABLE interno.produtos_tipos_caixa_embalagem IS
  'Opcional: por produto, sobrescrever box_units / package_units quando a linha usa este tipo de caixa.';
COMMENT ON COLUMN interno.produtos_tipos_caixa_embalagem.box_units_override IS
  'Se não nulo, substitui produtos.box_units na conversão latas → caixas para este par produto+tipo.';
COMMENT ON COLUMN interno.produtos_tipos_caixa_embalagem.package_units_override IS
  'Se não nulo, substitui produtos.package_units quando aplicável.';

ALTER TABLE interno.ordens_producao_diarias_itens
  ADD COLUMN IF NOT EXISTS tipo_caixa_embalagem_id uuid NULL
    REFERENCES interno.tipos_caixa_embalagem (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ordens_producao_diarias_itens_tipo_caixa_idx
  ON interno.ordens_producao_diarias_itens (tipo_caixa_embalagem_id)
  WHERE tipo_caixa_embalagem_id IS NOT NULL;

COMMENT ON COLUMN interno.ordens_producao_diarias_itens.tipo_caixa_embalagem_id IS
  'Tipo de caixa na linha; estimativa usa override (produto×tipo), senão unidades do tipo, senão box_units do produto.';

-- ---------------------------------------------------------------------------
-- RLS (alinhado à ordem diária)
-- ---------------------------------------------------------------------------

ALTER TABLE interno.tipos_caixa_embalagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE interno.produtos_tipos_caixa_embalagem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tipos_caixa_embalagem_select_authenticated" ON interno.tipos_caixa_embalagem;
CREATE POLICY "tipos_caixa_embalagem_select_authenticated"
  ON interno.tipos_caixa_embalagem FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tipos_caixa_embalagem_insert_admin" ON interno.tipos_caixa_embalagem;
CREATE POLICY "tipos_caixa_embalagem_insert_admin"
  ON interno.tipos_caixa_embalagem FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "tipos_caixa_embalagem_update_admin" ON interno.tipos_caixa_embalagem;
CREATE POLICY "tipos_caixa_embalagem_update_admin"
  ON interno.tipos_caixa_embalagem FOR UPDATE TO authenticated
  USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "tipos_caixa_embalagem_delete_admin" ON interno.tipos_caixa_embalagem;
CREATE POLICY "tipos_caixa_embalagem_delete_admin"
  ON interno.tipos_caixa_embalagem FOR DELETE TO authenticated
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "produtos_tipos_caixa_embalagem_select_authenticated" ON interno.produtos_tipos_caixa_embalagem;
CREATE POLICY "produtos_tipos_caixa_embalagem_select_authenticated"
  ON interno.produtos_tipos_caixa_embalagem FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "produtos_tipos_caixa_embalagem_insert_admin" ON interno.produtos_tipos_caixa_embalagem;
CREATE POLICY "produtos_tipos_caixa_embalagem_insert_admin"
  ON interno.produtos_tipos_caixa_embalagem FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "produtos_tipos_caixa_embalagem_update_admin" ON interno.produtos_tipos_caixa_embalagem;
CREATE POLICY "produtos_tipos_caixa_embalagem_update_admin"
  ON interno.produtos_tipos_caixa_embalagem FOR UPDATE TO authenticated
  USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "produtos_tipos_caixa_embalagem_delete_admin" ON interno.produtos_tipos_caixa_embalagem;
CREATE POLICY "produtos_tipos_caixa_embalagem_delete_admin"
  ON interno.produtos_tipos_caixa_embalagem FOR DELETE TO authenticated
  USING ((SELECT is_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE interno.tipos_caixa_embalagem TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE interno.produtos_tipos_caixa_embalagem TO authenticated;
GRANT ALL ON TABLE interno.tipos_caixa_embalagem TO service_role;
GRANT ALL ON TABLE interno.produtos_tipos_caixa_embalagem TO service_role;
