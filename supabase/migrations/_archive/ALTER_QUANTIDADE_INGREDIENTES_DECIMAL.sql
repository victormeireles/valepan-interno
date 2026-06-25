-- =====================================================
-- MIGRAÇÃO: Ajustar campos de quantidade para 3 casas decimais
-- =====================================================
-- Altera campos de quantidade de ingredientes para DECIMAL(10,3)
-- para suportar valores com 3 casas decimais (ex: 0.015)
-- =====================================================

-- 1. ALTERAR TABELA: receita_ingredientes
-- =====================================================
-- Verifica o tipo atual e altera se necessário
DO $$
BEGIN
  -- Verifica se a coluna existe e qual é o tipo atual
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'receita_ingredientes'
    AND column_name = 'quantidade_padrao'
  ) THEN
    -- Altera para DECIMAL(10,3) se ainda não for
    ALTER TABLE public.receita_ingredientes
      ALTER COLUMN quantidade_padrao TYPE DECIMAL(10,3) USING quantidade_padrao::DECIMAL(10,3);
    
    COMMENT ON COLUMN public.receita_ingredientes.quantidade_padrao IS 
      'Quantidade padrão do ingrediente na receita (suporta 3 casas decimais, ex: 0.015)';
  END IF;
END $$;

-- 2. ALTERAR TABELA: producao_massa_ingredientes
-- =====================================================
-- Altera campos de quantidade para DECIMAL(10,3)
ALTER TABLE public.producao_massa_ingredientes
  ALTER COLUMN quantidade_padrao TYPE DECIMAL(10,3) USING quantidade_padrao::DECIMAL(10,3),
  ALTER COLUMN quantidade_usada TYPE DECIMAL(10,3) USING quantidade_usada::DECIMAL(10,3);

COMMENT ON COLUMN public.producao_massa_ingredientes.quantidade_padrao IS 
  'Quantidade padrão da receita (para referência e confronto) - suporta 3 casas decimais';

COMMENT ON COLUMN public.producao_massa_ingredientes.quantidade_usada IS 
  'Quantidade realmente usada na produção (para controle de estoque futuro) - suporta 3 casas decimais';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================







