-- ADD_CATEGORIA_VISIVEL_EMBALAGEM.sql
-- Visibilidade de categorias no painel Realizado / Embalagem

ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS visivel_embalagem boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN categorias.visivel_embalagem IS
  'Quando true, produtos desta categoria aparecem no painel Realizado / Embalagem.';

UPDATE categorias
SET visivel_embalagem = true
WHERE
  lower(trim(nome)) IN ('hambúrguer', 'hamburguer', 'hamburger', 'hot dog', 'hotdog')
  OR lower(trim(nome)) LIKE '%hamburg%'
  OR lower(trim(nome)) LIKE '%hot dog%'
  OR lower(trim(nome)) LIKE '%hotdog%';
