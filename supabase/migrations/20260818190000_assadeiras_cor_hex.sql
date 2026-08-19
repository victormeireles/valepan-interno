ALTER TABLE public.assadeiras
  ADD COLUMN IF NOT EXISTS cor_hex text NOT NULL DEFAULT '#A8A29E';

ALTER TABLE public.assadeiras
  DROP CONSTRAINT IF EXISTS assadeiras_cor_hex_format;

ALTER TABLE public.assadeiras
  ADD CONSTRAINT assadeiras_cor_hex_format
  CHECK (cor_hex ~ '^#[0-9A-Fa-f]{6}$');

COMMENT ON COLUMN public.assadeiras.cor_hex IS
  'Cor estável da assadeira (#RRGGBB) usada no fluxo, OPs e produção.';

UPDATE public.assadeiras SET cor_hex = CASE nome
  WHEN '50g' THEN '#C6A848'
  WHEN '60g BM' THEN '#C2410C'
  WHEN '60g nova preta' THEN '#3F0313'
  WHEN '65 c/20' THEN '#6B7233'
  WHEN '65g c/ 24' THEN '#4D7C0F'
  WHEN '75g' THEN '#9A6B43'
  WHEN 'Bun' THEN '#B45309'
  WHEN 'Careca/Doce' THEN '#CA8A04'
  WHEN 'Hot' THEN '#78716C'
  WHEN 'Hot big' THEN '#44403C'
  WHEN 'Lisa' THEN '#9F1239'
  WHEN 'Pão Francês' THEN '#A3374D'
  ELSE cor_hex
END;
