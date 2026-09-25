-- Pessoas etapa 1: setores, turnos, dias de horário e colaboradores.
-- RLS via auth_tem_modulo('interno_pessoas', ...). Sem policy de DELETE.

CREATE TABLE public.pessoas_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('operacional', 'apoio')),
  agrupamento_proposto boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pessoas_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  setor_id uuid NOT NULL REFERENCES public.pessoas_setores(id),
  nome text NOT NULL,
  operacional boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pessoas_turnos_setor_id_idx ON public.pessoas_turnos (setor_id);

CREATE TABLE public.pessoas_turno_dias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id uuid NOT NULL REFERENCES public.pessoas_turnos(id) ON DELETE CASCADE,
  dia smallint NOT NULL CHECK (dia >= 1 AND dia <= 6),
  inicio time NULL,
  fim time NULL,
  termina_dia_seguinte boolean NOT NULL DEFAULT false,
  situacao text NOT NULL CHECK (situacao IN ('definido', 'nao_trabalha', 'a_confirmar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pessoas_turno_dias_turno_dia_uidx UNIQUE (turno_id, dia),
  CONSTRAINT pessoas_turno_dias_horario_chk CHECK (
    (
      situacao = 'definido'
      AND inicio IS NOT NULL
      AND fim IS NOT NULL
    )
    OR (
      situacao IN ('nao_trabalha', 'a_confirmar')
      AND inicio IS NULL
      AND fim IS NULL
    )
  )
);

CREATE INDEX pessoas_turno_dias_turno_id_idx ON public.pessoas_turno_dias (turno_id);

CREATE TABLE public.pessoas_colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  apelido text NULL,
  nascimento date NULL,
  nome_mae text NULL,
  cpf text NULL,
  cpf_verificado boolean NOT NULL DEFAULT false,
  endereco text NULL,
  telefone text NULL,
  email text NULL,
  cargo text NULL,
  situacao text NOT NULL CHECK (situacao IN ('ativo', 'admissao_prevista', 'desligado')),
  cadastro_incompleto boolean NOT NULL DEFAULT false,
  setor_id uuid NULL REFERENCES public.pessoas_setores(id),
  turno_id uuid NULL REFERENCES public.pessoas_turnos(id),
  data_admissao date NULL,
  data_desligamento date NULL,
  desligamento_data_desconhecida boolean NOT NULL DEFAULT false,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pessoas_colaboradores_setor_id_idx ON public.pessoas_colaboradores (setor_id);
CREATE INDEX pessoas_colaboradores_turno_id_idx ON public.pessoas_colaboradores (turno_id);
CREATE INDEX pessoas_colaboradores_situacao_idx ON public.pessoas_colaboradores (situacao);
CREATE INDEX pessoas_colaboradores_nome_idx ON public.pessoas_colaboradores (nome);

ALTER TABLE public.pessoas_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_turno_dias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY pessoas_setores_select ON public.pessoas_setores
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_setores_insert ON public.pessoas_setores
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_setores_update ON public.pessoas_setores
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));

CREATE POLICY pessoas_turnos_select ON public.pessoas_turnos
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_turnos_insert ON public.pessoas_turnos
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_turnos_update ON public.pessoas_turnos
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));

CREATE POLICY pessoas_turno_dias_select ON public.pessoas_turno_dias
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_turno_dias_insert ON public.pessoas_turno_dias
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_turno_dias_update ON public.pessoas_turno_dias
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));

CREATE POLICY pessoas_colaboradores_select ON public.pessoas_colaboradores
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_colaboradores_insert ON public.pessoas_colaboradores
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_colaboradores_update ON public.pessoas_colaboradores
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
