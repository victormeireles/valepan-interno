-- Corrige FK producao_etapas_log.ordem_producao_id → interno.ordens_producao
--
-- Sintoma: insert em interno.producao_etapas_log falha com
--   producao_etapas_log_ordem_producao_id_fkey (23503)
-- mesmo com a OP visível em interno.ordens_producao via PostgREST (schema interno).
-- Causa típica: constraint legada referenciando public.ordens_producao após migração para interno.

DO $$
BEGIN
  IF to_regclass('interno.producao_etapas_log') IS NOT NULL
     AND to_regclass('interno.ordens_producao') IS NOT NULL THEN
    ALTER TABLE interno.producao_etapas_log
      DROP CONSTRAINT IF EXISTS producao_etapas_log_ordem_producao_id_fkey;

    ALTER TABLE interno.producao_etapas_log
      ADD CONSTRAINT producao_etapas_log_ordem_producao_id_fkey
      FOREIGN KEY (ordem_producao_id)
      REFERENCES interno.ordens_producao (id)
      ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON CONSTRAINT producao_etapas_log_ordem_producao_id_fkey ON interno.producao_etapas_log IS
  'Vínculo com ordem operacional no schema interno (alinhado ao client Supabase db.schema=interno).';
