-- Posição atual de estoque por produto e tipo (tipos_estoque): uma linha por par (produto, tipo).
-- Auditoria: alterações manuais na tabela estoque (INSERT/UPDATE/DELETE).
-- Schema interno (não usar public).

CREATE SCHEMA IF NOT EXISTS interno;

GRANT USAGE ON SCHEMA interno TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION interno.set_updated_at ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS interno.estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  produto_id uuid NOT NULL REFERENCES interno.produtos (id) ON DELETE RESTRICT,
  tipo_estoque_id uuid NOT NULL REFERENCES interno.tipos_estoque (id) ON DELETE RESTRICT,
  caixas integer NOT NULL DEFAULT 0,
  pacotes integer NOT NULL DEFAULT 0,
  unidades integer NOT NULL DEFAULT 0,
  kg numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estoque_quantidades_nn CHECK (
    caixas >= 0
    AND pacotes >= 0
    AND unidades >= 0
    AND kg >= 0
  ),
  CONSTRAINT estoque_produto_tipo_unique UNIQUE (produto_id, tipo_estoque_id)
);

CREATE INDEX IF NOT EXISTS estoque_produto_idx ON interno.estoque (produto_id);

CREATE INDEX IF NOT EXISTS estoque_tipo_estoque_idx ON interno.estoque (tipo_estoque_id);

COMMENT ON TABLE interno.estoque IS 'Posição atual de estoque por produto e tipo de estoque (sem data — estado corrente).';

COMMENT ON COLUMN interno.estoque.tipo_estoque_id IS 'Classificação (tabela tipos_estoque).';

COMMENT ON COLUMN interno.estoque.caixas IS 'Quantidade em caixas (inteiro).';

COMMENT ON COLUMN interno.estoque.pacotes IS 'Quantidade em pacotes (inteiro).';

COMMENT ON COLUMN interno.estoque.unidades IS 'Quantidade em unidades (inteiro).';

COMMENT ON COLUMN interno.estoque.kg IS 'Quantidade em quilogramas (decimal).';

DROP TRIGGER IF EXISTS trg_estoque_set_updated_at ON interno.estoque;

CREATE TRIGGER trg_estoque_set_updated_at
  BEFORE UPDATE ON interno.estoque
  FOR EACH ROW
  EXECUTE PROCEDURE interno.set_updated_at ();

CREATE TABLE IF NOT EXISTS interno.estoque_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  estoque_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('insert', 'update', 'delete')),
  dados_anteriores jsonb,
  dados_novos jsonb,
  criado_em timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS estoque_auditoria_estoque_idx ON interno.estoque_auditoria (estoque_id);

CREATE INDEX IF NOT EXISTS estoque_auditoria_criado_idx ON interno.estoque_auditoria (criado_em DESC);

COMMENT ON TABLE interno.estoque_auditoria IS 'Histórico de inclusões, alterações e exclusões manuais em estoque (trigger).';

COMMENT ON COLUMN interno.estoque_auditoria.dados_anteriores IS 'Snapshot JSON do registo antes do UPDATE/DELETE.';

COMMENT ON COLUMN interno.estoque_auditoria.dados_novos IS 'Snapshot JSON do registo após INSERT/UPDATE.';

CREATE OR REPLACE FUNCTION interno.estoque_audit_fn ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = interno
  AS $$
DECLARE
  j_old jsonb;
  j_new jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    j_new := to_jsonb (NEW);
    INSERT INTO interno.estoque_auditoria (estoque_id, tipo, dados_anteriores, dados_novos)
      VALUES (NEW.id, 'insert', NULL, j_new);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    j_old := to_jsonb (OLD);
    j_new := to_jsonb (NEW);
    INSERT INTO interno.estoque_auditoria (estoque_id, tipo, dados_anteriores, dados_novos)
      VALUES (NEW.id, 'update', j_old, j_new);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    j_old := to_jsonb (OLD);
    INSERT INTO interno.estoque_auditoria (estoque_id, tipo, dados_anteriores, dados_novos)
      VALUES (OLD.id, 'delete', j_old, NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_audit ON interno.estoque;

CREATE TRIGGER trg_estoque_audit
  AFTER INSERT OR UPDATE OR DELETE ON interno.estoque
  FOR EACH ROW
  EXECUTE PROCEDURE interno.estoque_audit_fn ();

ALTER TABLE interno.estoque ENABLE ROW LEVEL SECURITY;

ALTER TABLE interno.estoque_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estoque_select_authenticated" ON interno.estoque;

CREATE POLICY "estoque_select_authenticated" ON interno.estoque
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "estoque_insert_authenticated" ON interno.estoque;

CREATE POLICY "estoque_insert_authenticated" ON interno.estoque
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "estoque_update_authenticated" ON interno.estoque;

CREATE POLICY "estoque_update_authenticated" ON interno.estoque
  FOR UPDATE TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "estoque_delete_authenticated" ON interno.estoque;

CREATE POLICY "estoque_delete_authenticated" ON interno.estoque
  FOR DELETE TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "estoque_auditoria_select_authenticated" ON interno.estoque_auditoria;

CREATE POLICY "estoque_auditoria_select_authenticated" ON interno.estoque_auditoria
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA interno TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA interno TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA interno TO authenticated, service_role;
