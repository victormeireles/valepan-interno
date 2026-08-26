-- Conversão visual opcional: 1 unidade de conferência = conversao_fator × unidade oficial.
-- Estoque, custo e receitas continuam na unidade oficial (unidade_id).

ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS conversao_unidade_id uuid REFERENCES unidades(id),
  ADD COLUMN IF NOT EXISTS conversao_fator numeric;

ALTER TABLE insumos
  DROP CONSTRAINT IF EXISTS insumos_conversao_par_check;

ALTER TABLE insumos
  ADD CONSTRAINT insumos_conversao_par_check
  CHECK (
    (conversao_unidade_id IS NULL AND conversao_fator IS NULL)
    OR (
      conversao_unidade_id IS NOT NULL
      AND conversao_fator IS NOT NULL
      AND conversao_fator > 0
      AND conversao_unidade_id <> unidade_id
    )
  );

COMMENT ON COLUMN insumos.conversao_unidade_id IS
  'Unidade de conferência opcional (ex.: UN para bobina). Estoque permanece em unidade_id.';

COMMENT ON COLUMN insumos.conversao_fator IS
  'Quantidade na unidade oficial equivalente a 1 unidade de conferência (ex.: 5.2 kg por UN).';
