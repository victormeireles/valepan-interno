-- Nome + número de buracos + descrição no cadastro de latas (assadeiras)
ALTER TABLE public.assadeiras
  ADD COLUMN IF NOT EXISTS numero_buracos integer NOT NULL DEFAULT 0;

ALTER TABLE public.assadeiras
  ADD COLUMN IF NOT EXISTS descricao text NULL;

COMMENT ON COLUMN public.assadeiras.numero_buracos IS 'Quantidade de cavidades/buracos da assadeira (lata).';
COMMENT ON COLUMN public.assadeiras.descricao IS 'Observações sobre o tipo de lata.';

ALTER TABLE public.assadeiras
  ADD COLUMN IF NOT EXISTS diametro_buracos_mm numeric NULL;

COMMENT ON COLUMN public.assadeiras.diametro_buracos_mm IS 'Diâmetro de cada buraco (milímetros), se aplicável.';
