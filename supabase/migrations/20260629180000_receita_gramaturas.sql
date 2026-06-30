-- Quantidades padrão por gramatura para receitas (brilho, confeito, antimofo, embalagem, caixa)

CREATE TABLE IF NOT EXISTS public.receita_gramaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receita_id uuid NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
  peso_g integer NOT NULL CHECK (peso_g >= 1),
  quantidade_padrao numeric NOT NULL CHECK (quantidade_padrao > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (receita_id, peso_g)
);

CREATE INDEX IF NOT EXISTS idx_receita_gramaturas_receita_id
  ON public.receita_gramaturas (receita_id);

ALTER TABLE public.receita_gramaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY receita_gramaturas_select_authenticated
  ON public.receita_gramaturas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY receita_gramaturas_insert_authenticated
  ON public.receita_gramaturas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY receita_gramaturas_update_authenticated
  ON public.receita_gramaturas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY receita_gramaturas_delete_authenticated
  ON public.receita_gramaturas
  FOR DELETE
  TO authenticated
  USING (true);
