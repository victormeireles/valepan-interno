-- =============================================================================
-- Ordem diária: tipo_lata aceita apenas UUID da assadeira (cadastro em
-- interno.produto_assadeiras). Remove suporte a 'antiga', 'nova', 'outra'.
--
-- Pré-requisito: cada linha com tipo_lata legado deve ter pelo menos uma
-- entrada em interno.produto_assadeiras para o mesmo produto_id (senão a
-- migração falha com mensagem explícita).
-- =============================================================================

DO $$
DECLARE
  bloqueadas integer;
BEGIN
  SELECT count(*)::integer INTO bloqueadas
  FROM interno.ordens_producao_diarias_itens it
  WHERE lower(trim(it.tipo_lata)) IN ('antiga', 'nova', 'outra')
    AND NOT EXISTS (
      SELECT 1
      FROM interno.produto_assadeiras pa
      WHERE pa.produto_id = it.produto_id
    );

  IF bloqueadas > 0 THEN
    RAISE EXCEPTION
      'ordens_producao_diarias_itens: % linha(s) com tipo_lata legado (antiga/nova/outra) sem cadastro de latas (produto_assadeiras) para o produto. Cadastre latas ou ajuste as linhas antes de aplicar esta migração.',
      bloqueadas;
  END IF;
END $$;

-- Primeira assadeira por produto (ordem estável por id).
UPDATE interno.ordens_producao_diarias_itens it
SET tipo_lata = sub.assadeira_id
FROM (
  SELECT DISTINCT ON (pa.produto_id)
    pa.produto_id,
    pa.assadeira_id
  FROM interno.produto_assadeiras pa
  ORDER BY pa.produto_id, pa.id
) sub
WHERE lower(trim(it.tipo_lata)) IN ('antiga', 'nova', 'outra')
  AND it.produto_id = sub.produto_id;

ALTER TABLE interno.ordens_producao_diarias_itens
  DROP CONSTRAINT IF EXISTS ordens_producao_diarias_itens_tipo_lata_check;

ALTER TABLE interno.ordens_producao_diarias_itens
  ADD CONSTRAINT ordens_producao_diarias_itens_tipo_lata_check
  CHECK (
    char_length(tipo_lata) = 36
    AND tipo_lata ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );

COMMENT ON COLUMN interno.ordens_producao_diarias_itens.tipo_lata IS
  'UUID da assadeira (interno.produto_assadeiras para produto_id desta linha).';
