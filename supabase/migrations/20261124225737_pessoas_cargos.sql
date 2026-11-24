CREATE TABLE public.pessoas_cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 2 AND 80),
  de_centavos integer NOT NULL CHECK (de_centavos >= 0),
  ate_centavos integer NOT NULL CHECK (ate_centavos >= 0),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pessoas_cargos_faixa_chk CHECK (ate_centavos >= de_centavos)
);

CREATE UNIQUE INDEX pessoas_cargos_nome_lower_idx ON public.pessoas_cargos (lower(nome));

ALTER TABLE public.pessoas_colaboradores
  ADD COLUMN cargo_id uuid REFERENCES public.pessoas_cargos (id) ON DELETE RESTRICT;

CREATE INDEX pessoas_colaboradores_cargo_id_idx ON public.pessoas_colaboradores (cargo_id);

ALTER TABLE public.pessoas_cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY pessoas_cargos_select
  ON public.pessoas_cargos
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')));

CREATE POLICY pessoas_cargos_insert
  ON public.pessoas_cargos
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')));

CREATE POLICY pessoas_cargos_update
  ON public.pessoas_cargos
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')));

CREATE POLICY pessoas_cargos_delete
  ON public.pessoas_cargos
  FOR DELETE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'administrar')));
