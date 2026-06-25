-- CREATE_ETIQUETAS_GERADAS.sql
-- Referência para novos ambientes: fila de etiquetas pós-embalagem

CREATE TABLE IF NOT EXISTS etiquetas_geradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_producao_id uuid REFERENCES ordens_producao(id) ON DELETE SET NULL,
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  tipo_estoque_id uuid NOT NULL REFERENCES tipos_estoque(id) ON DELETE RESTRICT,
  data_fabricacao date NOT NULL,
  modo text NOT NULL CHECK (modo IN ('pedido', 'manual')),
  gerado_em timestamptz NOT NULL DEFAULT now(),
  gerado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE etiquetas_geradas IS
  'Registro de etiquetas geradas — separado de embalagem_lotes';

CREATE UNIQUE INDEX IF NOT EXISTS etiquetas_geradas_ordem_producao_unique
  ON etiquetas_geradas (ordem_producao_id)
  WHERE ordem_producao_id IS NOT NULL;

ALTER TABLE tipos_estoque
  ADD COLUMN IF NOT EXISTS mostrar_texto_congelado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN tipos_estoque.mostrar_texto_congelado IS
  'Exibe texto CONGELADO na etiqueta';

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS nome_etiqueta text,
  ADD COLUMN IF NOT EXISTS dias_validade_ambiente integer NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS dias_validade_congelado integer NOT NULL DEFAULT 90;

COMMENT ON COLUMN produtos.nome_etiqueta IS
  'Nome exibido na etiqueta; null usa produtos.nome';

ALTER TABLE etiquetas_geradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etiquetas_geradas_select" ON etiquetas_geradas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "etiquetas_geradas_insert" ON etiquetas_geradas
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "etiquetas_geradas_update" ON etiquetas_geradas
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "etiquetas_geradas_delete" ON etiquetas_geradas
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));
