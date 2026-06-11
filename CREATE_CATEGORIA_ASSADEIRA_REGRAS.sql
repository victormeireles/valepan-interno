-- CREATE_CATEGORIA_ASSADEIRA_REGRAS.sql
-- Referência para novos ambientes (peso exato)

CREATE TABLE IF NOT EXISTS categoria_assadeira_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  peso_g integer NOT NULL CHECK (peso_g > 0),
  assadeira_id uuid NOT NULL REFERENCES assadeiras(id) ON DELETE RESTRICT,
  unidades_por_assadeira integer CHECK (
    unidades_por_assadeira IS NULL OR unidades_por_assadeira >= 1
  ),
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categoria_id, peso_g, assadeira_id)
);

COMMENT ON TABLE categoria_assadeira_regras IS
  'Regra padrão: categoria + peso exato (gramas) → tipo(s) de assadeira';

COMMENT ON COLUMN categoria_assadeira_regras.peso_g IS
  'Peso em gramas inteiras; deve coincidir com resolvePesoGramas do produto';

COMMENT ON COLUMN categoria_assadeira_regras.unidades_por_assadeira IS
  'Override opcional de pães por assadeira; null herda de assadeiras.unidades_por_assadeira';

ALTER TABLE categoria_assadeira_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categoria_assadeira_regras_select" ON categoria_assadeira_regras
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "categoria_assadeira_regras_insert" ON categoria_assadeira_regras
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "categoria_assadeira_regras_update" ON categoria_assadeira_regras
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "categoria_assadeira_regras_delete" ON categoria_assadeira_regras
  FOR DELETE TO authenticated USING ((SELECT is_admin()));
