-- =====================================================
-- ATUALIZAR producao_massa_ingredientes
-- =====================================================
-- Renomear coluna producao_massa_lote_id para producao_etapas_log_id
-- e atualizar a foreign key para referenciar producao_etapas_log
-- =====================================================

-- 1. REMOVER FOREIGN KEY ANTIGA
-- =====================================================

ALTER TABLE public.producao_massa_ingredientes
  DROP CONSTRAINT IF EXISTS producao_massa_ingredientes_producao_massa_lote_id_fkey;

-- 2. RENOMEAR COLUNA
-- =====================================================

ALTER TABLE public.producao_massa_ingredientes
  RENAME COLUMN producao_massa_lote_id TO producao_etapas_log_id;

-- 3. ADICIONAR NOVA FOREIGN KEY
-- =====================================================

ALTER TABLE public.producao_massa_ingredientes
  ADD CONSTRAINT producao_massa_ingredientes_producao_etapas_log_id_fkey
  FOREIGN KEY (producao_etapas_log_id)
  REFERENCES public.producao_etapas_log(id)
  ON DELETE CASCADE;

-- 4. ADICIONAR COMENTÁRIO
-- =====================================================

COMMENT ON COLUMN public.producao_massa_ingredientes.producao_etapas_log_id IS 
  'ID do log de etapa de produção (referencia producao_etapas_log.id)';

-- =====================================================
-- FIM DA ATUALIZAÇÃO
-- =====================================================







