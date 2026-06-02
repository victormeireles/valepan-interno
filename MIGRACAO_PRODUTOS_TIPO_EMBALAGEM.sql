-- Tipo de embalagem do produto (rótulo / fornecedor). Ex.: Lisa, Valepan, Damião.
-- Execute no Supabase SQL Editor antes de usar o resumo de estoque em produção com a coluna tipo_embalagem.

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tipo_embalagem text;

COMMENT ON COLUMN produtos.tipo_embalagem IS 'Tipo ou marca de embalagem (ex.: Lisa, Valepan, Damião).';
