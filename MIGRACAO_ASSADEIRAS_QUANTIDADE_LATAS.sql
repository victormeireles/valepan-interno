-- Capacidade em latas no cadastro de assadeiras (independente do nº de buracos físicos, se necessário)
ALTER TABLE public.assadeiras
  ADD COLUMN IF NOT EXISTS quantidade_latas integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.assadeiras.quantidade_latas IS 'Quantidade de latas que a assadeira comporta.';

UPDATE public.assadeiras
SET quantidade_latas = GREATEST(0, COALESCE(numero_buracos, 0))
WHERE quantidade_latas = 0;
