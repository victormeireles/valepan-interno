ALTER TABLE public.pessoas_colaboradores
  ADD COLUMN indicacao text NULL;

ALTER TABLE public.pessoas_colaboradores
  ADD CONSTRAINT pessoas_colaboradores_indicacao_check
  CHECK (indicacao IS NULL OR char_length(indicacao) <= 120);
