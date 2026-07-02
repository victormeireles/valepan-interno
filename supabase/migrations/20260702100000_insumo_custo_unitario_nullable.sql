-- Custo tri-state: null = pendente, 0 = sem custo, > 0 = definido
-- Estratégia C: registros existentes com 0 permanecem 0

ALTER TABLE insumos
  ALTER COLUMN custo_unitario DROP NOT NULL,
  ALTER COLUMN custo_unitario SET DEFAULT null;

COMMENT ON COLUMN insumos.custo_unitario IS
  'null = custo pendente; 0 = sem custo intencional; > 0 = custo definido';
