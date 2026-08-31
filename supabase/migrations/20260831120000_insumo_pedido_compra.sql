CREATE TABLE IF NOT EXISTS public.insumo_pedido_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer GENERATED ALWAYS AS IDENTITY UNIQUE,
  fornecedor_nome text NOT NULL CHECK (length(trim(fornecedor_nome)) > 0),
  data_chegada_prevista date NOT NULL,
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'encerrado', 'cancelado')),
  observacao text NULL,
  criado_por uuid NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.insumo_pedido_compra_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.insumo_pedido_compra(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  UNIQUE (pedido_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_insumo_pedido_compra_status_data
  ON public.insumo_pedido_compra (status, data_chegada_prevista);

CREATE INDEX IF NOT EXISTS idx_insumo_pedido_compra_item_insumo
  ON public.insumo_pedido_compra_item (insumo_id);

ALTER TABLE public.insumo_pedido_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumo_pedido_compra_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY insumo_pedido_compra_select ON public.insumo_pedido_compra
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insumo_pedido_compra_insert ON public.insumo_pedido_compra
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY insumo_pedido_compra_update ON public.insumo_pedido_compra
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY insumo_pedido_compra_delete ON public.insumo_pedido_compra
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

CREATE POLICY insumo_pedido_compra_item_select ON public.insumo_pedido_compra_item
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insumo_pedido_compra_item_insert ON public.insumo_pedido_compra_item
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY insumo_pedido_compra_item_update ON public.insumo_pedido_compra_item
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY insumo_pedido_compra_item_delete ON public.insumo_pedido_compra_item
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

COMMENT ON TABLE public.insumo_pedido_compra IS
  'Pedido de compra de insumos (compromisso a chegar; não altera insumo_saldos)';
