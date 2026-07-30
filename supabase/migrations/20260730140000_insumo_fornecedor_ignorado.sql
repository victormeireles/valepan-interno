-- Fornecedores sempre ignorados no mapeamento de insumos (match por CNPJ)

CREATE TABLE IF NOT EXISTS public.insumo_fornecedor_ignorado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  fornecedor_cnpj text NOT NULL,
  fornecedor_nome text,
  fornecedor_razao_social text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users(id),
  CONSTRAINT insumo_fornecedor_ignorado_cnpj_digits
    CHECK (fornecedor_cnpj ~ '^[0-9]{14}$'),
  CONSTRAINT insumo_fornecedor_ignorado_empresa_cnpj_unique
    UNIQUE (empresa_id, fornecedor_cnpj)
);

CREATE INDEX IF NOT EXISTS idx_insumo_fornecedor_ignorado_empresa
  ON public.insumo_fornecedor_ignorado (empresa_id);

ALTER TABLE public.insumo_fornecedor_ignorado ENABLE ROW LEVEL SECURITY;

CREATE POLICY insumo_fornecedor_ignorado_select
  ON public.insumo_fornecedor_ignorado
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY insumo_fornecedor_ignorado_insert
  ON public.insumo_fornecedor_ignorado
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY insumo_fornecedor_ignorado_update
  ON public.insumo_fornecedor_ignorado
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY insumo_fornecedor_ignorado_delete
  ON public.insumo_fornecedor_ignorado
  FOR DELETE TO authenticated
  USING (true);

COMMENT ON TABLE public.insumo_fornecedor_ignorado IS
  'Fornecedores (CNPJ) cujas NFs devem nascer ignoradas no mapeamento de insumos';
