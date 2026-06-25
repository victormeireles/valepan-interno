-- ALTER_CATEGORIA_ASSADEIRA_REGRAS_PESO_EXATO.sql
-- Pré-requisito: categoria_assadeira_regras vazia

ALTER TABLE categoria_assadeira_regras
  DROP CONSTRAINT IF EXISTS categoria_assadeira_regras_categoria_id_peso_min_g_peso_max_g_key;

ALTER TABLE categoria_assadeira_regras
  DROP COLUMN peso_min_g,
  DROP COLUMN peso_max_g;

ALTER TABLE categoria_assadeira_regras
  ADD COLUMN peso_g integer NOT NULL CHECK (peso_g > 0);

ALTER TABLE categoria_assadeira_regras
  ADD CONSTRAINT categoria_assadeira_regras_categoria_peso_assadeira_key
  UNIQUE (categoria_id, peso_g, assadeira_id);

CREATE INDEX IF NOT EXISTS idx_categoria_assadeira_regras_lookup
  ON categoria_assadeira_regras (categoria_id, peso_g)
  WHERE ativo = true;

COMMENT ON TABLE categoria_assadeira_regras IS
  'Regra padrão: categoria + peso exato (gramas) → tipo(s) de assadeira';

COMMENT ON COLUMN categoria_assadeira_regras.peso_g IS
  'Peso em gramas inteiras; deve coincidir com resolvePesoGramas do produto';
