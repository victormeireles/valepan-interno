-- Controle de uso dos carrinhos (fermentação → forno → embalagem; reutilização no mesmo processo)
ALTER TABLE public.carrinhos
  ADD COLUMN IF NOT EXISTS em_uso boolean NOT NULL DEFAULT false;

ALTER TABLE public.carrinhos
  ADD COLUMN IF NOT EXISTS latas_ocupadas integer NOT NULL DEFAULT 0;

ALTER TABLE public.carrinhos
  DROP CONSTRAINT IF EXISTS carrinhos_latas_ocupadas_non_negative;

ALTER TABLE public.carrinhos
  ADD CONSTRAINT carrinhos_latas_ocupadas_non_negative CHECK (latas_ocupadas >= 0);

CREATE INDEX IF NOT EXISTS carrinhos_em_uso_idx ON public.carrinhos (em_uso);

COMMENT ON COLUMN public.carrinhos.em_uso IS 'Se o carrinho está alocado (fermentação, fila, embalagem, etc.).';
COMMENT ON COLUMN public.carrinhos.latas_ocupadas IS 'Quantas latas estão no carrinho no momento (quando em uso).';
COMMENT ON COLUMN public.carrinhos.quantidade_latas IS 'Capacidade máxima de latas que cabem no carrinho.';
