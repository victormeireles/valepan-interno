-- Diâmetro dos buracos (mm) no cadastro de latas (assadeiras)
ALTER TABLE public.assadeiras
  ADD COLUMN IF NOT EXISTS diametro_buracos_mm numeric NULL;

COMMENT ON COLUMN public.assadeiras.diametro_buracos_mm IS 'Diâmetro de cada buraco (milímetros), se aplicável.';
