-- MIGRATE_PRODUTO_ASSADEIRAS_ORDEM.sql
-- Prioridade explícita em exceções produto → assadeira (paridade com categoria_assadeira_regras)
-- Aplicar no SQL Editor do Supabase antes de rodar npm run gen:types

ALTER TABLE produto_assadeiras
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN produto_assadeiras.ordem IS
  'Prioridade do vínculo no produto; menor = default em pedidos/ordens';

UPDATE produto_assadeiras SET ordem = 0;
