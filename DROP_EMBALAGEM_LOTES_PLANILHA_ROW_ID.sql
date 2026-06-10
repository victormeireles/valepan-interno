DROP INDEX IF EXISTS idx_embalagem_lotes_planilha_row_id;

ALTER TABLE embalagem_lotes
  DROP COLUMN IF EXISTS planilha_row_id,
  DROP COLUMN IF EXISTS planilha_row_id_origem;
