-- Use se public.estoque já existir COM coluna data_referencia.
-- Consolida uma linha por (produto_id, tipo_estoque_id): mantém o registo mais recente por updated_at.
-- Revise antes em cópia / backup.

BEGIN;

DROP INDEX IF EXISTS estoque_data_idx;

ALTER TABLE public.estoque
  DROP CONSTRAINT IF EXISTS estoque_data_produto_tipo_unique;

ALTER TABLE public.estoque
  DROP CONSTRAINT IF EXISTS estoque_data_cliente_produto_unique;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY produto_id, tipo_estoque_id
      ORDER BY
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST
    ) AS rn
  FROM public.estoque
)
DELETE FROM public.estoque e
USING ranked r
WHERE e.id = r.id
  AND r.rn > 1;

ALTER TABLE public.estoque
  DROP COLUMN IF EXISTS data_referencia;

ALTER TABLE public.estoque
  DROP COLUMN IF EXISTS cliente_id;

ALTER TABLE public.estoque
  ADD CONSTRAINT estoque_produto_tipo_unique UNIQUE (produto_id, tipo_estoque_id);

COMMIT;
