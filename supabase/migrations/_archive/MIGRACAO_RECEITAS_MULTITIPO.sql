-- =====================================================
-- MIGRAÇÃO: Sistema de Receitas Multitipo
-- =====================================================
-- Este script implementa o novo modelo de receitas
-- que permite múltiplos tipos (massa, brilho, confeito, embalagem, caixa)
-- por produto, substituindo o modelo antigo 1:1.
-- =====================================================

-- 1. CRIAR ENUM PARA TIPOS DE RECEITA
-- =====================================================
CREATE TYPE tipo_receita AS ENUM ('massa', 'brilho', 'confeito', 'embalagem', 'caixa');

-- 2. ATUALIZAR TABELA RECEITAS
-- =====================================================
-- Adicionar coluna tipo (obrigatória)
ALTER TABLE receitas 
ADD COLUMN IF NOT EXISTS tipo tipo_receita NOT NULL DEFAULT 'massa';

-- Adicionar constraint para garantir que tipo seja válido (já garantido pelo enum, mas por segurança)
-- O enum já faz isso, então não precisa de CHECK adicional

-- 3. CRIAR TABELA PRODUTO_RECEITAS
-- =====================================================
-- Esta tabela vincula produtos a receitas por tipo
CREATE TABLE IF NOT EXISTS produto_receitas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  receita_id UUID NOT NULL REFERENCES receitas(id) ON DELETE CASCADE,
  tipo tipo_receita NOT NULL,
  quantidade_por_produto DECIMAL NOT NULL CHECK (quantidade_por_produto > 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Um produto só pode ter uma receita de cada tipo ativa
  CONSTRAINT produto_receitas_produto_tipo_unique UNIQUE (produto_id, tipo)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produto_receitas_produto_id ON produto_receitas(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_receitas_receita_id ON produto_receitas(receita_id);
CREATE INDEX IF NOT EXISTS idx_produto_receitas_tipo ON produto_receitas(tipo);
CREATE INDEX IF NOT EXISTS idx_produto_receitas_ativo ON produto_receitas(ativo);

-- Comentários para documentação
COMMENT ON TABLE produto_receitas IS 'Vincula produtos a receitas por tipo. Permite que um produto tenha múltiplas receitas (massa, brilho, etc.)';
COMMENT ON COLUMN produto_receitas.tipo IS 'Tipo da receita (deve corresponder ao tipo da receita vinculada)';
COMMENT ON COLUMN produto_receitas.quantidade_por_produto IS 'Interpretação varia por tipo: Massa/Brilho/Confeito/Antimofo=nº produtos por receita, Embalagem=pães por pacote, Caixa=pacotes por caixa';

-- 3.1. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================
-- As políticas RLS garantem que:
-- - Leitura: Qualquer usuário autenticado pode ler os vínculos (necessário para produção)
-- - Escrita: Apenas administradores podem criar, atualizar ou deletar vínculos
-- Nota: A função is_admin() deve estar disponível no banco de dados
-- =====================================================
ALTER TABLE produto_receitas ENABLE ROW LEVEL SECURITY;

-- 3.2. POLÍTICAS RLS
-- =====================================================

-- Política de SELECT: Usuários autenticados podem ler todas as receitas vinculadas
-- (incluindo inativas para histórico, mas filtro no código para apenas ativas)
CREATE POLICY "produto_receitas_select_authenticated"
ON produto_receitas
FOR SELECT
TO authenticated
USING (true);

-- Política de INSERT: Apenas administradores podem criar novos vínculos
CREATE POLICY "produto_receitas_insert_admin"
ON produto_receitas
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Política de UPDATE: Apenas administradores podem atualizar vínculos
CREATE POLICY "produto_receitas_update_admin"
ON produto_receitas
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Política de DELETE: Apenas administradores podem deletar vínculos
-- Nota: Normalmente usa-se soft delete (ativo=false), mas manter delete físico disponível
CREATE POLICY "produto_receitas_delete_admin"
ON produto_receitas
FOR DELETE
TO authenticated
USING (is_admin());

-- 4. MIGRAÇÃO DE DADOS (SE HOUVER DADOS EXISTENTES)
-- =====================================================
-- Migrar receitas existentes para tipo 'massa' se ainda não tiverem tipo
-- (o DEFAULT já faz isso, mas garantimos para receitas antigas)
UPDATE receitas 
SET tipo = 'massa' 
WHERE tipo IS NULL;

-- Migrar vínculos existentes de produtos.receita_id para produto_receitas
-- IMPORTANTE: Este passo pressupõe que produtos.rendimento_receita_unidades existe
-- e será usado como quantidade_por_produto inicial
INSERT INTO produto_receitas (produto_id, receita_id, tipo, quantidade_por_produto, ativo)
SELECT 
  p.id,
  p.receita_id,
  'massa',
  COALESCE(p.rendimento_receita_unidades, 1), -- Se não tiver rendimento, assume 1 (será ajustado manualmente)
  p.ativo
FROM produtos p
WHERE p.receita_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM produto_receitas pr 
    WHERE pr.produto_id = p.id AND pr.tipo = 'massa'
  );

-- 5. REMOVER COLUNAS ANTIGAS DE PRODUTOS
-- =====================================================
-- ATENÇÃO: Executar apenas após validar que a migração foi bem-sucedida!

-- Remover foreign key constraint primeiro
ALTER TABLE produtos 
DROP CONSTRAINT IF EXISTS produtos_receita_id_fkey;

-- Remover as colunas antigas
ALTER TABLE produtos 
DROP COLUMN IF EXISTS receita_id,
DROP COLUMN IF EXISTS rendimento_receita_unidades,
DROP COLUMN IF EXISTS peso_pre_assado;

-- 6. TRIGGER PARA ATUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_produto_receitas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_produto_receitas_updated_at
BEFORE UPDATE ON produto_receitas
FOR EACH ROW
EXECUTE FUNCTION update_produto_receitas_updated_at();

-- 7. VIEW HELPER PARA CONSULTAS (OPCIONAL)
-- =====================================================
-- View para facilitar consultas de produtos com suas receitas
CREATE OR REPLACE VIEW vw_produtos_com_receitas AS
SELECT 
  p.id as produto_id,
  p.nome as produto_nome,
  p.codigo as produto_codigo,
  pr.tipo as tipo_receita,
  r.id as receita_id,
  r.nome as receita_nome,
  r.codigo as receita_codigo,
  pr.quantidade_por_produto,
  pr.ativo as receita_vinculada_ativa,
  r.ativo as receita_ativa
FROM produtos p
LEFT JOIN produto_receitas pr ON p.id = pr.produto_id AND pr.ativo = true
LEFT JOIN receitas r ON pr.receita_id = r.id AND r.ativo = true
WHERE p.ativo = true;

COMMENT ON VIEW vw_produtos_com_receitas IS 'View auxiliar para listar produtos com suas receitas vinculadas por tipo';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
-- IMPORTANTE: 
-- 1. Fazer backup do banco antes de executar
-- 2. Executar em ambiente de teste primeiro
-- 3. Validar os dados migrados antes de remover colunas antigas
-- 4. Ajustar código da aplicação para usar a nova estrutura
-- =====================================================

