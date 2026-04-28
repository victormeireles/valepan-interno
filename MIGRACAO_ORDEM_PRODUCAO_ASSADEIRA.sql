-- Tipo de lata escolhido na ordem de produção (planejamento).
-- Execute no Supabase SQL Editor antes de usar a opção no modal "Nova ordem".

ALTER TABLE public.ordens_producao
  ADD COLUMN IF NOT EXISTS assadeira_id uuid NULL REFERENCES public.assadeiras (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ordens_producao_assadeira_id_idx ON public.ordens_producao (assadeira_id)
  WHERE assadeira_id IS NOT NULL;

COMMENT ON COLUMN public.ordens_producao.assadeira_id IS 'Assadeira (tipo de lata) definida no planejamento; exibe na fila massa. NULL = inferir pelo cadastro produto_assadeiras.';
