-- DROP_ASSADEIRAS_CODIGO.sql
-- Remove coluna codigo da tabela assadeiras (campo não utilizado)

DROP INDEX IF EXISTS public.assadeiras_codigo_unique;

ALTER TABLE public.assadeiras
  DROP COLUMN IF EXISTS codigo;
