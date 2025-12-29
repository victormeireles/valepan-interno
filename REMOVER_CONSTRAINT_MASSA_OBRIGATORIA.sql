-- =====================================================
-- REMOVER CONSTRAINT QUE EXIGE CAMPOS DE MASSA NA CRIAÇÃO
-- =====================================================
-- Esta constraint está impedindo a criação inicial do log de etapa massa
-- Os campos de massa serão preenchidos quando um lote for criado,
-- não na criação inicial do log de etapa.
-- =====================================================

-- Remover a constraint CHECK que exige campos de massa na criação
ALTER TABLE public.producao_etapas_log
  DROP CONSTRAINT IF EXISTS producao_etapas_log_massa_fields_check;

-- =====================================================
-- NOTA: A validação dos campos de massa será feita na camada de aplicação
-- quando um lote de massa for criado/atualizado, não na criação do log.
-- =====================================================

