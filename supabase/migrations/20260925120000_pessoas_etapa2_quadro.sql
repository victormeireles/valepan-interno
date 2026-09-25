-- Pessoas etapa 2: posições e alocações. Sem policy de DELETE.

CREATE TABLE public.pessoas_posicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  setor_id uuid NOT NULL REFERENCES public.pessoas_setores(id),
  turno_id uuid NOT NULL REFERENCES public.pessoas_turnos(id),
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pessoas_posicoes_turno_id_idx ON public.pessoas_posicoes (turno_id);

CREATE TABLE public.pessoas_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.pessoas_colaboradores(id),
  setor_id uuid NOT NULL REFERENCES public.pessoas_setores(id),
  turno_id uuid NOT NULL REFERENCES public.pessoas_turnos(id),
  posicao_id uuid NULL REFERENCES public.pessoas_posicoes(id),
  papel text NOT NULL CHECK (papel IN ('ocupacao', 'reserva', 'apoio')),
  inicio date NOT NULL DEFAULT CURRENT_DATE,
  fim date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pessoas_alocacoes_papel_posicao_chk CHECK (
    (papel = 'apoio' AND posicao_id IS NULL)
    OR (papel IN ('ocupacao', 'reserva') AND posicao_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX pessoas_alocacoes_pessoa_aberta_uidx
  ON public.pessoas_alocacoes (colaborador_id)
  WHERE fim IS NULL;

CREATE UNIQUE INDEX pessoas_alocacoes_posicao_aberta_uidx
  ON public.pessoas_alocacoes (posicao_id)
  WHERE fim IS NULL AND posicao_id IS NOT NULL;

ALTER TABLE public.pessoas_posicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_alocacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pessoas_posicoes_select ON public.pessoas_posicoes
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_posicoes_insert ON public.pessoas_posicoes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_posicoes_update ON public.pessoas_posicoes
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));

CREATE POLICY pessoas_alocacoes_select ON public.pessoas_alocacoes
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_alocacoes_insert ON public.pessoas_alocacoes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_alocacoes_update ON public.pessoas_alocacoes
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
