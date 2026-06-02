-- Ordem de produção diária (planejamento): cabecalho + linhas antes da OP operacional (`ordens_producao`)

CREATE TABLE IF NOT EXISTS interno.ordens_producao_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  data_producao date NOT NULL,
  data_etiqueta_default date NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'pronto', 'em_producao', 'concluido')
  ),
  created_at timestamptz DEFAULT now (),
  updated_at timestamptz DEFAULT now (),
  CONSTRAINT ordens_producao_diarias_data_unique UNIQUE (data_producao)
);

CREATE TABLE IF NOT EXISTS interno.ordens_producao_diarias_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  ordem_diaria_id uuid NOT NULL REFERENCES interno.ordens_producao_diarias (id) ON DELETE CASCADE,
  prioridade integer NOT NULL DEFAULT 1,
  produto_id uuid NOT NULL REFERENCES interno.produtos (id),
  tipo_lata text NOT NULL CHECK (
    char_length(tipo_lata) = 36
    AND tipo_lata ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  ),
  latas_planejadas integer NOT NULL DEFAULT 0,
  caixas_estimadas integer NOT NULL DEFAULT 0,
  clientes jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_producao_override date,
  data_etiqueta_override date,
  observacao text,
  status_linha text NOT NULL DEFAULT 'rascunho' CHECK (
    status_linha IN ('rascunho', 'pronto', 'em_producao', 'concluido')
  ),
  created_at timestamptz DEFAULT now (),
  updated_at timestamptz DEFAULT now (),
  CONSTRAINT ordens_producao_diarias_itens_latas_nn CHECK (latas_planejadas >= 0),
  CONSTRAINT ordens_producao_diarias_itens_caixas_nn CHECK (caixas_estimadas >= 0)
);

CREATE INDEX IF NOT EXISTS ordens_producao_diarias_itens_ordem_prioridade_idx ON interno.ordens_producao_diarias_itens (
  ordem_diaria_id,
  prioridade
);

DROP TRIGGER IF EXISTS trg_ordens_producao_diarias_set_updated_at ON interno.ordens_producao_diarias;

CREATE TRIGGER trg_ordens_producao_diarias_set_updated_at
BEFORE UPDATE ON interno.ordens_producao_diarias
FOR EACH ROW
EXECUTE PROCEDURE interno.set_updated_at ();

DROP TRIGGER IF EXISTS trg_ordens_producao_diarias_itens_set_updated_at ON interno.ordens_producao_diarias_itens;

CREATE TRIGGER trg_ordens_producao_diarias_itens_set_updated_at
BEFORE UPDATE ON interno.ordens_producao_diarias_itens
FOR EACH ROW
EXECUTE PROCEDURE interno.set_updated_at ();

COMMENT ON TABLE interno.ordens_producao_diarias IS 'Cabecalho da ordem de producao planejada por dia.';
COMMENT ON TABLE interno.ordens_producao_diarias_itens IS 'Linhas da ordem diaria (produto + tipo de lata, prioridade, planejamento em latas).';

-- RLS
ALTER TABLE interno.ordens_producao_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE interno.ordens_producao_diarias_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ordens_producao_diarias_select_authenticated"
ON interno.ordens_producao_diarias
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "ordens_producao_diarias_insert_admin"
ON interno.ordens_producao_diarias
FOR INSERT
TO authenticated
WITH CHECK (
  (
    SELECT is_admin ()
  ));

CREATE POLICY "ordens_producao_diarias_update_admin"
ON interno.ordens_producao_diarias
FOR UPDATE
TO authenticated
USING (
  (
    SELECT is_admin ()
  ))
WITH CHECK (
  (
    SELECT is_admin ()
  ));

CREATE POLICY "ordens_producao_diarias_delete_admin"
ON interno.ordens_producao_diarias
FOR DELETE
TO authenticated
USING (
  (
    SELECT is_admin ()
  ));

CREATE POLICY "ordens_producao_diarias_itens_select_authenticated"
ON interno.ordens_producao_diarias_itens
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "ordens_producao_diarias_itens_insert_admin"
ON interno.ordens_producao_diarias_itens
FOR INSERT
TO authenticated
WITH CHECK (
  (
    SELECT is_admin ()
  ));

CREATE POLICY "ordens_producao_diarias_itens_update_admin"
ON interno.ordens_producao_diarias_itens
FOR UPDATE
TO authenticated
USING (
  (
    SELECT is_admin ()
  ))
WITH CHECK (
  (
    SELECT is_admin ()
  ));

CREATE POLICY "ordens_producao_diarias_itens_delete_admin"
ON interno.ordens_producao_diarias_itens
FOR DELETE
TO authenticated
USING (
  (
    SELECT is_admin ()
  ));
