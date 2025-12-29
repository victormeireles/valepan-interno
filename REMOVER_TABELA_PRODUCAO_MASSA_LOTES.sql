-- =====================================================
-- REMOVER TABELA producao_massa_lotes
-- =====================================================
-- Esta migration finaliza a consolidação dos dados de massa
-- na tabela producao_etapas_log, removendo a tabela obsoleta.
-- 
-- PRÉ-REQUISITOS:
-- 1. Executar MESCLAR_PRODUCAO_MASSA_LOTES_EM_PRODUCAO_ETAPAS_LOG.sql
-- 2. Executar ATUALIZAR_PRODUCAO_MASSA_INGREDIENTES.sql
-- 3. Garantir que todos os dados foram migrados (se houver dados históricos)
-- =====================================================

-- 1. MIGRAR DADOS EXISTENTES (SE HOUVER)
-- =====================================================
-- Nota: Esta seção migra dados históricos de producao_massa_lotes
-- para producao_etapas_log. Se não houver dados históricos, este bloco
-- pode ser ignorado, mas é seguro executar mesmo assim.

-- Migrar dados de producao_massa_lotes para producao_etapas_log
-- Apenas atualiza registros onde os campos ainda estão NULL em producao_etapas_log
-- Apenas executa se a tabela producao_massa_lotes ainda existir
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'producao_massa_lotes'
  ) THEN
    UPDATE public.producao_etapas_log pel
    SET
      receita_id = COALESCE(pel.receita_id, pml.receita_id),
      masseira_id = COALESCE(pel.masseira_id, pml.masseira_id),
      receitas_batidas = COALESCE(pel.receitas_batidas, pml.receitas_batidas),
      temperatura_final = COALESCE(pel.temperatura_final, pml.temperatura_final),
      tempo_lenta = COALESCE(pel.tempo_lenta, pml.tempo_lenta),
      tempo_rapida = COALESCE(pel.tempo_rapida, pml.tempo_rapida),
      textura = COALESCE(pel.textura, pml.textura)
    FROM public.producao_massa_lotes pml
    WHERE pel.id = pml.producao_etapas_log_id
      AND pel.etapa = 'massa'
      AND (
        pel.receita_id IS NULL OR
        pel.masseira_id IS NULL OR
        pel.receitas_batidas IS NULL OR
        pel.temperatura_final IS NULL OR
        pel.tempo_lenta IS NULL OR
        pel.tempo_rapida IS NULL OR
        pel.textura IS NULL
      );
  END IF;
END $$;

-- 2. REMOVER FOREIGN KEYS QUE REFERENCIAM producao_massa_lotes
-- =====================================================

-- Remover FK de producao_massa_ingredientes (caso ainda exista com o nome antigo)
ALTER TABLE public.producao_massa_ingredientes
  DROP CONSTRAINT IF EXISTS producao_massa_ingredientes_producao_massa_lote_id_fkey;

-- 3. REMOVER FOREIGN KEYS DE producao_massa_lotes
-- =====================================================
-- Apenas executa se a tabela ainda existir

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'producao_massa_lotes'
  ) THEN
    -- Remover FK para masseiras
    ALTER TABLE public.producao_massa_lotes
      DROP CONSTRAINT IF EXISTS producao_massa_lotes_masseira_id_fkey;

    -- Remover FK para producao_etapas_log
    ALTER TABLE public.producao_massa_lotes
      DROP CONSTRAINT IF EXISTS producao_massa_lotes_producao_etapas_log_id_fkey;

    -- Remover FK para receitas
    ALTER TABLE public.producao_massa_lotes
      DROP CONSTRAINT IF EXISTS producao_massa_lotes_receita_id_fkey;

    -- Remover FK para usuarios
    ALTER TABLE public.producao_massa_lotes
      DROP CONSTRAINT IF EXISTS producao_massa_lotes_usuario_id_fkey;
  END IF;
END $$;

-- 4. REMOVER A TABELA producao_massa_lotes
-- =====================================================

DROP TABLE IF EXISTS public.producao_massa_lotes CASCADE;

-- 5. VERIFICAR SE HÁ VIEWS OU FUNÇÕES QUE DEPENDEM DA TABELA
-- =====================================================
-- Nota: O CASCADE acima remove automaticamente dependências,
-- mas é bom verificar manualmente se há views ou funções que
-- referenciam esta tabela.

-- =====================================================
-- FIM DA REMOÇÃO DA TABELA
-- =====================================================
-- 
-- Após executar esta migration:
-- 1. Regenerar os tipos do database (npm run gen-types)
-- 2. Verificar se não há mais referências a producao_massa_lotes no código
-- 3. Remover o arquivo ProductionMassaLoteRepository.ts após confirmar
--    que não há mais dependências
-- =====================================================

