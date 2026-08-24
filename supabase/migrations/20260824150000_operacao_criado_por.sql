-- Auditoria de quem registrou operações. Nulo nos registros já existentes.

ALTER TABLE public.fermentacao_lotes
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.forno_lotes
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.embalagem_lotes
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.ordens_producao
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.estoque_movimentos
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fermentacao_lotes_criado_por_idx
  ON public.fermentacao_lotes (criado_por);

CREATE INDEX IF NOT EXISTS forno_lotes_criado_por_idx
  ON public.forno_lotes (criado_por);

CREATE INDEX IF NOT EXISTS embalagem_lotes_criado_por_idx
  ON public.embalagem_lotes (criado_por);

CREATE INDEX IF NOT EXISTS ordens_producao_criado_por_idx
  ON public.ordens_producao (criado_por);

CREATE INDEX IF NOT EXISTS estoque_movimentos_criado_por_idx
  ON public.estoque_movimentos (criado_por);

COMMENT ON COLUMN public.fermentacao_lotes.criado_por IS
  'Usuário que registrou o lote. Nulo em registros anteriores à auditoria.';

COMMENT ON COLUMN public.forno_lotes.criado_por IS
  'Usuário que registrou o lote. Nulo em registros anteriores à auditoria.';

COMMENT ON COLUMN public.embalagem_lotes.criado_por IS
  'Usuário que registrou o lote. Nulo em registros anteriores à auditoria.';

COMMENT ON COLUMN public.ordens_producao.criado_por IS
  'Usuário que criou/importou a ordem. Nulo em registros anteriores à auditoria. Não é sobrescrito em upsert.';

COMMENT ON COLUMN public.estoque_movimentos.criado_por IS
  'Usuário que gerou o movimento. Nulo em registros anteriores à auditoria.';
