-- Ordem de exibição dos setores no quadro de pessoas.
ALTER TABLE public.pessoas_setores
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

WITH ordenados AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY nome ASC) - 1)::integer AS nova_ordem
  FROM public.pessoas_setores
)
UPDATE public.pessoas_setores s
SET ordem = ordenados.nova_ordem
FROM ordenados
WHERE s.id = ordenados.id;

CREATE INDEX IF NOT EXISTS pessoas_setores_ordem_idx ON public.pessoas_setores (ordem);
