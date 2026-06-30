-- Categoria da compra Omie (aba Informações Adicionais do recebimento NF-e)
ALTER TABLE insumo_entrada_pendencias
  ADD COLUMN IF NOT EXISTS categoria_compra_codigo text,
  ADD COLUMN IF NOT EXISTS categoria_compra_descricao text;
