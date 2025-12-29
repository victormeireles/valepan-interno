-- =====================================================
-- MESCLAR producao_massa_lotes EM producao_etapas_log
-- =====================================================
-- Este script mescla os campos específicos da etapa massa
-- da tabela producao_massa_lotes diretamente em producao_etapas_log
-- =====================================================

-- 1. ADICIONAR CAMPOS OPCIONAIS EM producao_etapas_log
-- =====================================================

-- Adicionar receita_id
ALTER TABLE public.producao_etapas_log
  ADD COLUMN IF NOT EXISTS receita_id UUID NULL;

-- Adicionar masseira_id
ALTER TABLE public.producao_etapas_log
  ADD COLUMN IF NOT EXISTS masseira_id UUID NULL;

-- Adicionar receitas_batidas
ALTER TABLE public.producao_etapas_log
  ADD COLUMN IF NOT EXISTS receitas_batidas NUMERIC NULL;

-- Adicionar temperatura_final
ALTER TABLE public.producao_etapas_log
  ADD COLUMN IF NOT EXISTS temperatura_final NUMERIC NULL;

-- Adicionar tempo_lenta
ALTER TABLE public.producao_etapas_log
  ADD COLUMN IF NOT EXISTS tempo_lenta DECIMAL(5,2) NULL;

-- Adicionar tempo_rapida
ALTER TABLE public.producao_etapas_log
  ADD COLUMN IF NOT EXISTS tempo_rapida DECIMAL(5,2) NULL;

-- Adicionar textura
ALTER TABLE public.producao_etapas_log
  ADD COLUMN IF NOT EXISTS textura TEXT NULL;

-- 2. ADICIONAR FOREIGN KEYS
-- =====================================================

-- FK para receitas
ALTER TABLE public.producao_etapas_log
  ADD CONSTRAINT producao_etapas_log_receita_id_fkey
  FOREIGN KEY (receita_id)
  REFERENCES public.receitas(id)
  ON DELETE RESTRICT;

-- FK para masseiras
ALTER TABLE public.producao_etapas_log
  ADD CONSTRAINT producao_etapas_log_masseira_id_fkey
  FOREIGN KEY (masseira_id)
  REFERENCES public.masseiras(id)
  ON DELETE RESTRICT;

-- 3. ADICIONAR CONSTRAINT CHECK PARA TEXTURA
-- =====================================================

ALTER TABLE public.producao_etapas_log
  ADD CONSTRAINT producao_etapas_log_textura_check
  CHECK (textura IS NULL OR textura IN ('ok', 'rasga'));

-- 4. CONSTRAINT CHECK PARA VALIDAR CAMPOS OBRIGATÓRIOS QUANDO etapa='massa'
-- =====================================================
-- NOTA: Esta constraint foi REMOVIDA porque os campos de massa podem ser NULL
-- na criação inicial do log de etapa. Eles serão preenchidos quando um lote
-- for criado através do ProductionMassaManager.createLote.
-- A validação dos campos de massa é feita na camada de aplicação.

-- Se você já executou esta migration anteriormente e a constraint foi criada,
-- execute REMOVER_CONSTRAINT_MASSA_OBRIGATORIA.sql para removê-la.

-- 5. ADICIONAR COMENTÁRIOS NAS COLUNAS
-- =====================================================

COMMENT ON COLUMN public.producao_etapas_log.receita_id IS 
  'ID da receita usada (obrigatório quando etapa=''massa'')';

COMMENT ON COLUMN public.producao_etapas_log.masseira_id IS 
  'ID da masseira usada (obrigatório quando etapa=''massa'')';

COMMENT ON COLUMN public.producao_etapas_log.receitas_batidas IS 
  'Quantidade de receitas batidas (obrigatório quando etapa=''massa'')';

COMMENT ON COLUMN public.producao_etapas_log.temperatura_final IS 
  'Temperatura final da massa ao sair da masseira em °C (obrigatório quando etapa=''massa'')';

COMMENT ON COLUMN public.producao_etapas_log.tempo_lenta IS 
  'Tempo de mistura lenta usado em minutos e segundos (ex: 5.50 = 5min 50seg) (obrigatório quando etapa=''massa'')';

COMMENT ON COLUMN public.producao_etapas_log.tempo_rapida IS 
  'Tempo de mistura rápida usado em minutos e segundos (ex: 3.30 = 3min 30seg) (obrigatório quando etapa=''massa'')';

COMMENT ON COLUMN public.producao_etapas_log.textura IS 
  'Textura da massa: ''ok'' (mole, estica e não rasga) ou ''rasga'' (obrigatório quando etapa=''massa'')';

-- =====================================================
-- FIM DA PRIMEIRA PARTE - Adição de campos
-- =====================================================




