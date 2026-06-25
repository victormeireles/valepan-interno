-- Adiciona colunas unidades_assadeira e peso_pre_assado na tabela produtos
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS unidades_assadeira INTEGER,
ADD COLUMN IF NOT EXISTS peso_pre_assado DECIMAL;













