CREATE INDEX IF NOT EXISTS idx_insumo_movimentos_numero_nf
  ON public.insumo_movimentos (numero_nf)
  WHERE numero_nf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_insumo_movimentos_empresa_insumo_entrada
  ON public.insumo_movimentos (empresa_id, insumo_id)
  WHERE origem = 'entrada_nf';
