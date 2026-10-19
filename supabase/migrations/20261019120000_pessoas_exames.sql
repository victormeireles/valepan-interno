CREATE TABLE public.pessoas_exames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.pessoas_colaboradores(id),
  data date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (colaborador_id, data)
);

CREATE INDEX pessoas_exames_colaborador_data_idx
  ON public.pessoas_exames (colaborador_id, data DESC);

ALTER TABLE public.pessoas_exames ENABLE ROW LEVEL SECURITY;

CREATE POLICY pessoas_exames_select ON public.pessoas_exames
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_exames_insert ON public.pessoas_exames
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_exames_delete ON public.pessoas_exames
  FOR DELETE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
