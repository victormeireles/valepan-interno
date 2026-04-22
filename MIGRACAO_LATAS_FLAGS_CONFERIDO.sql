-- Flags explícitos para lata antiga/nova e conferência manual do cadastro de latas.
-- Execute no Supabase SQL Editor após MIGRACAO_LATAS_PRODUTOS_CLIENTES.sql (se ainda não rodou).

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS permite_lata_antiga BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS permite_lata_nova BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS latas_cadastro_conferido BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.produtos.permite_lata_antiga IS 'Se o produto pode usar lata (assadeira) antiga.';
COMMENT ON COLUMN public.produtos.permite_lata_nova IS 'Se o produto pode usar lata nova.';
COMMENT ON COLUMN public.produtos.latas_cadastro_conferido IS 'Conferência manual de que o cadastro de latas foi revisado.';

UPDATE public.produtos
SET
  permite_lata_antiga = (unidades_lata_antiga IS NOT NULL OR unidades_assadeira IS NOT NULL),
  permite_lata_nova = (unidades_lata_nova IS NOT NULL)
WHERE true;
