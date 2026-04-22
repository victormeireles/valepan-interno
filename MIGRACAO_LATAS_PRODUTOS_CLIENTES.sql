-- Cadastro de latas (assadeiras): antiga vs nova por produto; restrição por cliente.
-- Execute no Supabase SQL Editor antes de usar a tela /produtos/latas.

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS unidades_lata_antiga INTEGER,
  ADD COLUMN IF NOT EXISTS unidades_lata_nova INTEGER;

COMMENT ON COLUMN public.produtos.unidades_lata_antiga IS 'Unidades do produto por lata (assadeira) antiga — espelhada em unidades_assadeira para o fluxo de produção.';
COMMENT ON COLUMN public.produtos.unidades_lata_nova IS 'Unidades por lata nova; NULL = produto não usa lata nova neste cadastro.';

-- Preenche antiga a partir do campo já usado na produção
UPDATE public.produtos
SET unidades_lata_antiga = unidades_assadeira
WHERE unidades_lata_antiga IS NULL
  AND unidades_assadeira IS NOT NULL;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS somente_lata_antiga BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clientes.somente_lata_antiga IS 'Se true, pedidos deste cliente devem usar apenas lata antiga (assadeira maior).';
