-- RENAME_ASSADEIRAS_QUANTIDADE.sql
-- Aplicar no SQL Editor do Supabase antes de npm run gen:types

ALTER TABLE assadeiras
  RENAME COLUMN quantidade_latas TO quantidade;

COMMENT ON COLUMN assadeiras.quantidade IS
  'Quantidade de assadeiras deste tipo em estoque';

COMMENT ON COLUMN assadeiras.unidades_por_assadeira IS
  'Pães por assadeira — capacidade padrão do tipo';
