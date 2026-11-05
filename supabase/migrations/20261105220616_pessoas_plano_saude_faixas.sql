CREATE TABLE public.pessoas_plano_saude_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idade_min integer NOT NULL CHECK (idade_min >= 0),
  idade_max integer,
  valor_centavos integer NOT NULL CHECK (valor_centavos >= 0),
  ordem integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pessoas_plano_saude_faixas_intervalo_chk CHECK (idade_max IS NULL OR idade_max >= idade_min)
);

ALTER TABLE public.pessoas_plano_saude_faixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY pessoas_plano_saude_faixas_select
  ON public.pessoas_plano_saude_faixas
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_config', 'ler'))
    OR (SELECT auth_tem_modulo('interno_pessoas', 'administrar'))
  );

CREATE POLICY pessoas_plano_saude_faixas_insert
  ON public.pessoas_plano_saude_faixas
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_config', 'administrar')));

CREATE POLICY pessoas_plano_saude_faixas_update
  ON public.pessoas_plano_saude_faixas
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_config', 'administrar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_config', 'administrar')));

CREATE POLICY pessoas_plano_saude_faixas_delete
  ON public.pessoas_plano_saude_faixas
  FOR DELETE TO authenticated
  USING (
    (SELECT is_admin())
    OR (SELECT auth_tem_modulo('interno_config', 'administrar'))
  );

INSERT INTO public.pessoas_plano_saude_faixas (idade_min, idade_max, valor_centavos, ordem) VALUES
  (0, 18, 21675, 1),
  (19, 23, 27094, 2),
  (24, 28, 33597, 3),
  (29, 33, 37293, 4),
  (34, 38, 39903, 5),
  (39, 43, 46287, 6),
  (44, 48, 55332, 7),
  (49, 53, 64849, 8),
  (54, 58, 77203, 9),
  (59, NULL, 130048, 10);
