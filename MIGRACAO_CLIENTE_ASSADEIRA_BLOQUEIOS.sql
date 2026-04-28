-- Exclusão: cliente não pode usar esta assadeira (lata), mesmo que o produto permita em produto_assadeiras.
CREATE TABLE IF NOT EXISTS public.cliente_assadeira_bloqueios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes (id) ON DELETE CASCADE,
  assadeira_id uuid NOT NULL REFERENCES public.assadeiras (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cliente_assadeira_bloqueios_unique UNIQUE (cliente_id, assadeira_id)
);

CREATE INDEX IF NOT EXISTS cliente_assadeira_bloqueios_assadeira_id_idx
  ON public.cliente_assadeira_bloqueios (assadeira_id);

CREATE INDEX IF NOT EXISTS cliente_assadeira_bloqueios_cliente_id_idx
  ON public.cliente_assadeira_bloqueios (cliente_id);

COMMENT ON TABLE public.cliente_assadeira_bloqueios IS
  'Bloqueio explícito: o cliente não pode receber OP/pedido com esta lata, além das regras do produto.';
