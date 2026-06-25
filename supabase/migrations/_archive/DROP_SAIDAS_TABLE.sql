-- Reverter migração da tabela saidas (usar estoque_movimentos com origem = 'saida')
ALTER TABLE estoque_movimentos DROP COLUMN IF EXISTS saida_id;
DROP TABLE IF EXISTS saidas CASCADE;
