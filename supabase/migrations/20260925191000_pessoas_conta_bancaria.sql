ALTER TABLE public.pessoas_colaboradores
  DROP COLUMN conta_bancaria,
  ADD COLUMN banco text NULL,
  ADD COLUMN agencia text NULL,
  ADD COLUMN conta_corrente text NULL,
  ADD COLUMN conta_poupanca boolean NOT NULL DEFAULT false;
