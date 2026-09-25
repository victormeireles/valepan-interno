ALTER TABLE public.reclamacoes
  ALTER COLUMN quantidade DROP NOT NULL,
  ALTER COLUMN unidade DROP NOT NULL;

ALTER TABLE public.reclamacoes
  DROP CONSTRAINT reclamacoes_quantidade_check,
  DROP CONSTRAINT reclamacoes_unidade_check;

ALTER TABLE public.reclamacoes
  ADD CONSTRAINT reclamacoes_quantidade_check
    CHECK (quantidade IS NULL OR quantidade >= 1),
  ADD CONSTRAINT reclamacoes_unidade_check
    CHECK (
      (quantidade IS NULL AND unidade IS NULL)
      OR (quantidade IS NOT NULL AND unidade IN ('pacotes', 'caixas'))
    );
