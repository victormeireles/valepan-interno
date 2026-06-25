-- Remover campo tipo da tabela produto_receitas
-- O tipo já está disponível através da tabela receitas

-- 1. Remover a view que depende da coluna tipo
DROP VIEW IF EXISTS vw_produtos_com_receitas CASCADE;

-- 2. Remover constraint UNIQUE que usa o campo tipo
ALTER TABLE produto_receitas DROP CONSTRAINT IF EXISTS produto_receitas_produto_tipo_unique;

-- 3. Remover índice que usa o campo tipo
DROP INDEX IF EXISTS idx_produto_receitas_tipo;

-- 4. Remover a coluna tipo
ALTER TABLE produto_receitas DROP COLUMN IF EXISTS tipo;

-- 5. Criar função para obter o tipo da receita (para uso em índices/constraints)
-- Usando plpgsql e IMMUTABLE para permitir uso em índices
-- Nota: Assumimos que o tipo da receita não muda após a criação
CREATE OR REPLACE FUNCTION get_receita_tipo(receita_id UUID)
RETURNS public.tipo_receita AS $$
BEGIN
  RETURN (SELECT tipo FROM public.receitas WHERE id = receita_id);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Criar índice único funcional para garantir que um produto não tenha duas receitas do mesmo tipo
-- Isso garante integridade no banco de dados mesmo sem o campo tipo na tabela
CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_receitas_produto_tipo_unique 
ON produto_receitas (produto_id, (get_receita_tipo(receita_id)))
WHERE ativo = true;

-- 7. Recriar a view usando o tipo da receita relacionada
CREATE OR REPLACE VIEW vw_produtos_com_receitas AS
SELECT 
  p.id as produto_id,
  p.nome as produto_nome,
  p.codigo as produto_codigo,
  r.tipo as tipo_receita,  -- Agora usa o tipo da receita, não de produto_receitas
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

-- Nota: A validação também é feita no código da aplicação (linkReceitaAoProduto)
-- mas este índice garante integridade referencial no banco de dados

