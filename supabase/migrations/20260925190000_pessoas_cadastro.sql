ALTER TABLE public.pessoas_colaboradores
  ADD COLUMN vale_transporte boolean NULL,
  ADD COLUMN contato_emergencia text NULL,
  ADD COLUMN telefone_emergencia text NULL,
  ADD COLUMN tamanho_camiseta text NULL,
  ADD COLUMN tamanho_calca text NULL,
  ADD COLUMN numero_calcado text NULL,
  ADD COLUMN conta_bancaria text NULL,
  ADD COLUMN chave_pix text NULL;
