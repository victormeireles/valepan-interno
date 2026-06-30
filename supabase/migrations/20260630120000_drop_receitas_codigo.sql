-- Remove coluna codigo da tabela receitas (campo não utilizado)

DROP VIEW IF EXISTS vw_produtos_com_receitas CASCADE;

ALTER TABLE public.receitas
  DROP COLUMN IF EXISTS codigo;

CREATE OR REPLACE VIEW vw_produtos_com_receitas AS
SELECT
  p.id AS produto_id,
  p.nome AS produto_nome,
  p.codigo AS produto_codigo,
  r.tipo AS tipo_receita,
  r.id AS receita_id,
  r.nome AS receita_nome,
  pr.quantidade_por_produto,
  pr.ativo AS receita_vinculada_ativa,
  r.ativo AS receita_ativa
FROM produtos p
LEFT JOIN produto_receitas pr ON p.id = pr.produto_id AND pr.ativo = true
LEFT JOIN receitas r ON pr.receita_id = r.id AND r.ativo = true
WHERE p.ativo = true;

COMMENT ON VIEW vw_produtos_com_receitas IS 'View auxiliar para listar produtos com suas receitas vinculadas por tipo';
