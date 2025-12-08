-- =====================================================
-- MIGRAÇÃO: Alterar campos de tempo para DECIMAL
-- =====================================================
-- Altera campos de tempo de mistura de INT para DECIMAL(5,2)
-- para suportar minutos e segundos (ex: 5.50 = 5min 50seg)
-- =====================================================

-- 1. ALTERAR TABELA: masseiras
-- =====================================================
ALTER TABLE public.masseiras
  ALTER COLUMN tempo_mistura_lenta_padrao TYPE DECIMAL(5,2) USING tempo_mistura_lenta_padrao::DECIMAL(5,2),
  ALTER COLUMN tempo_mistura_rapida_padrao TYPE DECIMAL(5,2) USING tempo_mistura_rapida_padrao::DECIMAL(5,2);

COMMENT ON COLUMN public.masseiras.tempo_mistura_lenta_padrao IS 
  'Tempo padrão de mistura lenta em minutos e segundos (ex: 5.50 = 5min 50seg)';

COMMENT ON COLUMN public.masseiras.tempo_mistura_rapida_padrao IS 
  'Tempo padrão de mistura rápida em minutos e segundos (ex: 3.30 = 3min 30seg)';

-- 2. ALTERAR TABELA: receita_masseira_parametros (se existir)
-- =====================================================
-- Verifica se a tabela existe antes de alterar
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'receita_masseira_parametros'
  ) THEN
    ALTER TABLE public.receita_masseira_parametros
      ALTER COLUMN tempo_mistura_lenta TYPE DECIMAL(5,2) USING tempo_mistura_lenta::DECIMAL(5,2),
      ALTER COLUMN tempo_mistura_rapida TYPE DECIMAL(5,2) USING tempo_mistura_rapida::DECIMAL(5,2);

    COMMENT ON COLUMN public.receita_masseira_parametros.tempo_mistura_lenta IS 
      'Tempo de mistura lenta em minutos e segundos (ex: 5.50 = 5min 50seg)';

    COMMENT ON COLUMN public.receita_masseira_parametros.tempo_mistura_rapida IS 
      'Tempo de mistura rápida em minutos e segundos (ex: 3.30 = 3min 30seg)';
  END IF;
END $$;

-- 3. ALTERAR TABELA: producao_massa_lotes
-- =====================================================
ALTER TABLE public.producao_massa_lotes
  ALTER COLUMN tempo_lenta TYPE DECIMAL(5,2) USING tempo_lenta::DECIMAL(5,2),
  ALTER COLUMN tempo_rapida TYPE DECIMAL(5,2) USING tempo_rapida::DECIMAL(5,2);

COMMENT ON COLUMN public.producao_massa_lotes.tempo_lenta IS 
  'Tempo de mistura lenta usado em minutos e segundos (ex: 5.50 = 5min 50seg)';

COMMENT ON COLUMN public.producao_massa_lotes.tempo_rapida IS 
  'Tempo de mistura rápida usado em minutos e segundos (ex: 3.30 = 3min 30seg)';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

