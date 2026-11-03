CREATE TABLE public.pessoas_remuneracao_vigencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.pessoas_colaboradores(id) ON DELETE CASCADE,
  inicio date NOT NULL,
  salario_centavos integer NOT NULL CHECK (salario_centavos >= 0),
  vale_transporte_centavos integer NOT NULL CHECK (vale_transporte_centavos >= 0),
  vale_alimentacao_centavos integer NOT NULL CHECK (vale_alimentacao_centavos >= 0),
  plano_saude boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (colaborador_id, inicio)
);

ALTER TABLE public.pessoas_remuneracao_vigencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY pessoas_remuneracao_vigencias_select
  ON public.pessoas_remuneracao_vigencias
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')));

CREATE POLICY pessoas_remuneracao_vigencias_insert
  ON public.pessoas_remuneracao_vigencias
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')));

CREATE POLICY pessoas_remuneracao_vigencias_update
  ON public.pessoas_remuneracao_vigencias
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')));

CREATE POLICY pessoas_remuneracao_vigencias_delete
  ON public.pessoas_remuneracao_vigencias
  FOR DELETE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')));
