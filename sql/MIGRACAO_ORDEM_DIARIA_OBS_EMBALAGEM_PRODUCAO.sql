-- Ordem diária: observação de embalagem vs observação de produção (linhas).
-- Idempotente. Copia `observacao` legada para `observacao_producao` quando a nova coluna ainda está vazia.

ALTER TABLE interno.ordens_producao_diarias_itens
  ADD COLUMN IF NOT EXISTS observacao_embalagem text,
  ADD COLUMN IF NOT EXISTS observacao_producao text;

UPDATE interno.ordens_producao_diarias_itens
SET observacao_producao = NULLIF(trim(observacao), '')
WHERE (observacao_producao IS NULL OR trim(observacao_producao) = '')
  AND observacao IS NOT NULL
  AND trim(observacao) <> '';

COMMENT ON COLUMN interno.ordens_producao_diarias_itens.observacao_embalagem IS
  'Notas para a equipa de embalagem (etiquetas, caixas, cliente, etc.).';
COMMENT ON COLUMN interno.ordens_producao_diarias_itens.observacao_producao IS
  'Notas para a produção (forno, massa, prioridades, etc.).';
COMMENT ON COLUMN interno.ordens_producao_diarias_itens.observacao IS
  'Legado: espelho histórico; preferir observacao_producao / observacao_embalagem.';
