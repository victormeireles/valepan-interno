-- Cliente destino em saídas (nullable; demais origens ficam NULL)
ALTER TABLE estoque_movimentos
  ADD COLUMN IF NOT EXISTS cliente text NULL;

COMMENT ON COLUMN estoque_movimentos.cliente IS
  'Nome do cliente destino em movimentos de origem saida. Espelha coluna cliente da planilha de saídas.';
