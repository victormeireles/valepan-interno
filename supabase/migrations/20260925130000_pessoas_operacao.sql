ALTER TABLE public.pessoas_colaboradores
  ADD COLUMN previsao_encerrada_em timestamptz NULL;

CREATE TABLE public.pessoas_avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.pessoas_colaboradores(id),
  tipo text NOT NULL CHECK (tipo IN ('com_trabalho', 'sem_trabalho')),
  inicio date NOT NULL,
  ultimo_dia date NULL,
  termino date NULL,
  observacao text NULL,
  situacao text NOT NULL CHECK (situacao IN ('ativo', 'cancelado', 'encerrado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pessoas_faltas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.pessoas_colaboradores(id),
  data date NOT NULL,
  atestado text NULL CHECK (atestado IN ('aguardando', 'apresentado', 'nao_apresentado')),
  classificacao text NOT NULL CHECK (classificacao IN ('pendente', 'justificada', 'injustificada')),
  observacao text NULL,
  setor_id uuid NULL REFERENCES public.pessoas_setores(id),
  turno_id uuid NULL REFERENCES public.pessoas_turnos(id),
  cancelada_em timestamptz NULL,
  motivo_cancelamento text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pessoas_faltas_ativa_uidx
  ON public.pessoas_faltas (colaborador_id, data)
  WHERE cancelada_em IS NULL;

CREATE TABLE public.pessoas_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NULL,
  observacao text NULL,
  disponivel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pessoas_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_extra_id uuid NOT NULL REFERENCES public.pessoas_extras(id),
  setor_id uuid NOT NULL REFERENCES public.pessoas_setores(id),
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  precisa_passagem boolean NOT NULL DEFAULT false,
  valor_passagem_centavos int NULL,
  valor_extra_centavos int NOT NULL CHECK (valor_extra_centavos >= 0),
  observacao text NULL,
  estado text NOT NULL CHECK (estado IN ('programado', 'realizado', 'cancelado')),
  pago_em timestamptz NULL,
  estornado_em timestamptz NULL,
  motivo_estorno text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fim > inicio)
);

ALTER TABLE public.pessoas_avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_faltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY pessoas_avisos_select ON public.pessoas_avisos FOR SELECT TO authenticated USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_avisos_insert ON public.pessoas_avisos FOR INSERT TO authenticated WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_avisos_update ON public.pessoas_avisos FOR UPDATE TO authenticated USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar'))) WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_faltas_select ON public.pessoas_faltas FOR SELECT TO authenticated USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_faltas_insert ON public.pessoas_faltas FOR INSERT TO authenticated WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_faltas_update ON public.pessoas_faltas FOR UPDATE TO authenticated USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar'))) WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_extras_select ON public.pessoas_extras FOR SELECT TO authenticated USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_extras_insert ON public.pessoas_extras FOR INSERT TO authenticated WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_extras_update ON public.pessoas_extras FOR UPDATE TO authenticated USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar'))) WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_servicos_select ON public.pessoas_servicos FOR SELECT TO authenticated USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_servicos_insert ON public.pessoas_servicos FOR INSERT TO authenticated WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_servicos_update ON public.pessoas_servicos FOR UPDATE TO authenticated USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar'))) WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));

CREATE OR REPLACE FUNCTION public.pessoas_admitir(p_codigo text, p_data date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid; v_papel text;
BEGIN
  SELECT id INTO v_col FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  SELECT papel INTO v_papel FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_papel IS DISTINCT FROM 'reserva' THEN RAISE EXCEPTION 'Só uma reserva em vaga pode virar admissão.'; END IF;
  UPDATE public.pessoas_alocacoes SET papel = 'ocupacao', updated_at = now() WHERE colaborador_id = v_col AND fim IS NULL;
  UPDATE public.pessoas_colaboradores SET situacao = 'ativo', data_admissao = p_data, updated_at = now() WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_desistir(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid; v_papel text;
BEGIN
  SELECT id INTO v_col FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  SELECT papel INTO v_papel FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_papel IS DISTINCT FROM 'reserva' THEN RAISE EXCEPTION 'Não há reserva ativa para desistir.'; END IF;
  UPDATE public.pessoas_alocacoes SET fim = CURRENT_DATE, updated_at = now() WHERE colaborador_id = v_col AND fim IS NULL;
  UPDATE public.pessoas_colaboradores SET previsao_encerrada_em = now(), updated_at = now() WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_transferir(p_codigo text, p_turno text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid; v_aloc uuid; v_turno uuid; v_setor uuid; v_operacional boolean; v_pos uuid;
BEGIN
  SELECT id INTO v_col FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  SELECT id INTO v_aloc FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_aloc IS NULL THEN RAISE EXCEPTION 'A pessoa não tem alocação aberta.'; END IF;
  SELECT id, setor_id, operacional INTO v_turno, v_setor, v_operacional FROM public.pessoas_turnos WHERE codigo = p_turno;
  IF v_turno IS NULL THEN RAISE EXCEPTION 'Turno não encontrado.'; END IF;
  IF v_operacional THEN
    SELECT p.id INTO v_pos FROM public.pessoas_posicoes p
    WHERE p.turno_id = v_turno AND p.ativa
      AND NOT EXISTS (SELECT 1 FROM public.pessoas_alocacoes a WHERE a.posicao_id = p.id AND a.fim IS NULL)
    ORDER BY p.codigo LIMIT 1;
    IF v_pos IS NULL THEN RAISE EXCEPTION 'Sem vaga livre nesse turno.'; END IF;
    UPDATE public.pessoas_alocacoes SET fim = CURRENT_DATE, updated_at = now() WHERE id = v_aloc;
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, posicao_id, papel)
    VALUES (v_col, v_setor, v_turno, v_pos, 'ocupacao');
  ELSE
    UPDATE public.pessoas_alocacoes SET fim = CURRENT_DATE, updated_at = now() WHERE id = v_aloc;
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, papel)
    VALUES (v_col, v_setor, v_turno, 'apoio');
  END IF;
  UPDATE public.pessoas_colaboradores SET setor_id = v_setor, turno_id = v_turno, updated_at = now() WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_avisar(
  p_codigo text, p_tipo text, p_inicio date, p_ultimo date, p_termino date, p_obs text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid;
BEGIN
  SELECT id INTO v_col FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  INSERT INTO public.pessoas_avisos (colaborador_id, tipo, inicio, ultimo_dia, termino, observacao, situacao)
  VALUES (v_col, p_tipo, p_inicio, p_ultimo, p_termino, p_obs, 'ativo');
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_desligar(p_codigo text, p_data date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid;
BEGIN
  SELECT id INTO v_col FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  IF p_data > CURRENT_DATE THEN
    UPDATE public.pessoas_colaboradores SET data_desligamento = p_data, updated_at = now() WHERE id = v_col;
    RETURN;
  END IF;
  UPDATE public.pessoas_alocacoes SET fim = p_data, updated_at = now() WHERE colaborador_id = v_col AND fim IS NULL;
  UPDATE public.pessoas_avisos SET situacao = 'encerrado', updated_at = now()
  WHERE colaborador_id = v_col AND situacao = 'ativo';
  UPDATE public.pessoas_colaboradores
  SET situacao = 'desligado', data_desligamento = p_data, updated_at = now()
  WHERE id = v_col;
END $$;
