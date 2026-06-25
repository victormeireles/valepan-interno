ALTER TABLE tipos_estoque
  ADD COLUMN IF NOT EXISTS congelado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN tipos_estoque.congelado IS
  'Produtos deste tipo de estoque exigem fluxo congelado (embalagem/etiqueta).';
