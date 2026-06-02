-- =============================================================================
-- Limpeza total de ordens operacionais (schema interno)
-- =============================================================================
-- Quando usar: ambiente de testes / migração do planejamento antigo, com backup
-- se houver qualquer dado de produção real a preservar.
--
-- O que faz:
--   1) Desassocia OP nas linhas da ordem diária (FK RESTRICT).
--   2) Remove ingredientes e lotes de massa ligados aos logs.
--   3) Remove todos os producao_etapas_log.
--   4) Remove todas as interno.ordens_producao.
--
-- NÃO apaga: interno.ordens_producao_diarias nem _itens (apenas ordens_producao_id).
-- Para também remover o planejamento diário, descomente o bloco opcional no fim.
-- =============================================================================

BEGIN;

UPDATE interno.ordens_producao_diarias_itens
SET
  ordens_producao_id = NULL,
  updated_at = now()
WHERE ordens_producao_id IS NOT NULL;

DELETE FROM interno.producao_massa_ingredientes AS pmi
WHERE EXISTS (
  SELECT 1 FROM interno.producao_etapas_log pel WHERE pel.id = pmi.producao_etapas_log_id
);

-- Tabela opcional (algumas bases já migraram lotes para producao_etapas_log)
DO $$
BEGIN
  IF to_regclass('interno.producao_massa_lotes') IS NOT NULL THEN
    DELETE FROM interno.producao_massa_lotes AS pml
    WHERE EXISTS (
      SELECT 1 FROM interno.producao_etapas_log pel WHERE pel.id = pml.producao_etapas_log_id
    );
  END IF;
END $$;

DELETE FROM interno.producao_etapas_log;

DELETE FROM interno.ordens_producao;

COMMIT;

-- -----------------------------------------------------------------------------
-- OPCIONAL: apagar também cabeçalho e linhas da ordem de produção diária
-- -----------------------------------------------------------------------------
-- BEGIN;
-- DELETE FROM interno.ordens_producao_diarias_itens;
-- DELETE FROM interno.ordens_producao_diarias;
-- COMMIT;
