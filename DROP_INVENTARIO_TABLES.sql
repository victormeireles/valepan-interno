-- Remove tabelas de inventário físico e o valor 'inventario' do enum de origem.
-- Aplicar no SQL Editor do Supabase (projeto valepan-pedidos).

-- 1. Garantir que nenhum movimento fique com origem inventario
UPDATE public.estoque_movimentos
SET origem = 'ajuste_manual'
WHERE origem = 'inventario';

-- 2. Dropar tabelas de inventário (itens primeiro por FK)
DROP TABLE IF EXISTS public.inventario_lancamento_itens;
DROP TABLE IF EXISTS public.inventario_lancamentos;

-- 3. Recriar enum sem o valor 'inventario'
ALTER TYPE public.estoque_movimento_origem
  RENAME TO estoque_movimento_origem_old;

CREATE TYPE public.estoque_movimento_origem AS ENUM (
  'embalagem',
  'saida',
  'ajuste_manual'
);

ALTER TABLE public.estoque_movimentos
  ALTER COLUMN origem TYPE public.estoque_movimento_origem
  USING origem::text::public.estoque_movimento_origem;

DROP TYPE public.estoque_movimento_origem_old;
