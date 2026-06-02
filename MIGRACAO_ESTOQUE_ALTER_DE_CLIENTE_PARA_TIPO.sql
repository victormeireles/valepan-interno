-- Migração incremental se já criou estoque com cliente_id.
-- Passo 1 (executar e confirmar dados): ver comentários no meio.
-- Passo 2: descomente o bloco final depois de todas as linhas terem tipo_estoque_id.

BEGIN;

ALTER TABLE public.estoque_auditoria
  DROP CONSTRAINT IF EXISTS estoque_auditoria_usuario_id_fkey;

ALTER TABLE public.estoque_auditoria
  DROP COLUMN IF EXISTS usuario_id;

ALTER TABLE public.estoque
  ADD COLUMN IF NOT EXISTS tipo_estoque_id uuid REFERENCES public.tipos_estoque (id) ON DELETE RESTRICT;

COMMIT;

-- ---- Pausa: rode um UPDATE com o tipo correto para cada linha, exemplo:
-- UPDATE public.estoque SET tipo_estoque_id = '<uuid-tipos_estoque>' WHERE tipo_estoque_id IS NULL;
-- Confirme: SELECT count(*) FROM public.estoque WHERE tipo_estoque_id IS NULL;  → 0

BEGIN;

ALTER TABLE public.estoque
  DROP CONSTRAINT IF EXISTS estoque_data_cliente_produto_unique;

ALTER TABLE public.estoque
  DROP COLUMN IF EXISTS cliente_id;

ALTER TABLE public.estoque
  ALTER COLUMN tipo_estoque_id SET NOT NULL;

ALTER TABLE public.estoque
  ADD CONSTRAINT estoque_produto_tipo_unique UNIQUE (produto_id, tipo_estoque_id);

DROP INDEX IF EXISTS estoque_cliente_idx;

CREATE INDEX IF NOT EXISTS estoque_tipo_estoque_idx ON public.estoque (tipo_estoque_id);

COMMIT;
