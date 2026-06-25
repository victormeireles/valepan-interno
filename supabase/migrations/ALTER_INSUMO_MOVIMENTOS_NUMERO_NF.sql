-- Número da NF nos movimentos de insumo (exibição no histórico de movimentos)
-- Entrada NF e resolução de pendência passam a guardar o número da nota.
ALTER TABLE insumo_movimentos
  ADD COLUMN IF NOT EXISTS numero_nf text;

-- Backfill: movimentos de resolução de pendência herdam o número da NF da pendência de origem.
-- (Entradas NF antigas não têm o dado disponível e permanecem nulas.)
UPDATE insumo_movimentos m
SET numero_nf = p.numero_nf
FROM insumo_entrada_pendencias p
WHERE m.pendencia_id = p.id
  AND m.numero_nf IS NULL
  AND p.numero_nf IS NOT NULL;
