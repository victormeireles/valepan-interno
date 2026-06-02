-- Corrige FK producao_massa_ingredientes.producao_etapas_log_id → interno.producao_etapas_log
--
-- Sintoma: insert em interno.producao_massa_ingredientes falha com
--   producao_massa_ingredientes_producao_etapas_log_id_fkey (23503)
-- após criar o log em interno.producao_etapas_log com sucesso.
-- Causa típica: constraint legada referenciando public.producao_etapas_log.

DO $$
BEGIN
  IF to_regclass('interno.producao_massa_ingredientes') IS NOT NULL
     AND to_regclass('interno.producao_etapas_log') IS NOT NULL THEN
    ALTER TABLE interno.producao_massa_ingredientes
      DROP CONSTRAINT IF EXISTS producao_massa_ingredientes_producao_etapas_log_id_fkey;

    ALTER TABLE interno.producao_massa_ingredientes
      ADD CONSTRAINT producao_massa_ingredientes_producao_etapas_log_id_fkey
      FOREIGN KEY (producao_etapas_log_id)
      REFERENCES interno.producao_etapas_log (id)
      ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON CONSTRAINT producao_massa_ingredientes_producao_etapas_log_id_fkey
  ON interno.producao_massa_ingredientes IS
  'Vínculo com log de etapa no schema interno (alinhado ao client Supabase db.schema=interno).';
