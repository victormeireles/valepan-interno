ALTER TABLE public.tipos_estoque
  ADD COLUMN IF NOT EXISTS receita_caixa_id uuid;

ALTER TABLE public.tipos_estoque
  DROP CONSTRAINT IF EXISTS tipos_estoque_receita_caixa_id_fkey;

ALTER TABLE public.tipos_estoque
  ADD CONSTRAINT tipos_estoque_receita_caixa_id_fkey
  FOREIGN KEY (receita_caixa_id)
  REFERENCES public.receitas(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.tipos_estoque.receita_caixa_id IS
  'Receita de caixa que substitui a do produto no consumo de embalagem. NULL = receita do produto.';
