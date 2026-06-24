-- Enriquecimento Omie em pendências de insumo (fornecedor, CFOP, natureza)
ALTER TABLE insumo_entrada_pendencias
  ADD COLUMN IF NOT EXISTS fornecedor_razao_social text,
  ADD COLUMN IF NOT EXISTS fornecedor_nome text,
  ADD COLUMN IF NOT EXISTS fornecedor_cnpj text,
  ADD COLUMN IF NOT EXISTS natureza_operacao text,
  ADD COLUMN IF NOT EXISTS valor_total_nf numeric(14, 2),
  ADD COLUMN IF NOT EXISTS cfop_entrada text,
  ADD COLUMN IF NOT EXISTS ncm_produto text;
