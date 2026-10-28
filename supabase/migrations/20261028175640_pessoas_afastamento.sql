-- Afastamento mantém a pessoa no quadro e libera a vaga ocupada.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pessoas_colaboradores'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%situacao%'
  LOOP
    EXECUTE format('ALTER TABLE public.pessoas_colaboradores DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.pessoas_colaboradores
  ADD CONSTRAINT pessoas_colaboradores_situacao_check
  CHECK (situacao IN ('ativo', 'admissao_prevista', 'desligado', 'afastado'));

ALTER TABLE public.pessoas_colaboradores
  ADD COLUMN afastamento text;

ALTER TABLE public.pessoas_colaboradores
  ADD CONSTRAINT pessoas_colaboradores_afastamento_check
  CHECK (
    (situacao = 'afastado' AND afastamento IN ('abandono', 'inss', 'outro'))
    OR (situacao <> 'afastado' AND afastamento IS NULL)
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pessoas_alocacoes'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%papel%'
  LOOP
    EXECUTE format('ALTER TABLE public.pessoas_alocacoes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.pessoas_alocacoes
  ADD CONSTRAINT pessoas_alocacoes_papel_check
  CHECK (papel IN ('ocupacao', 'reserva', 'apoio', 'afastado'));

ALTER TABLE public.pessoas_alocacoes
  ADD CONSTRAINT pessoas_alocacoes_papel_posicao_chk
  CHECK (
    (papel IN ('apoio', 'afastado') AND posicao_id IS NULL)
    OR (papel IN ('ocupacao', 'reserva') AND posicao_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.pessoas_afastar(p_codigo text, p_motivo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid; v_situacao text; v_aloc uuid;
BEGIN
  IF p_motivo NOT IN ('abandono', 'inss', 'outro') THEN
    RAISE EXCEPTION 'Informe o motivo do afastamento.';
  END IF;
  SELECT id, situacao INTO v_col, v_situacao FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  IF v_situacao IS DISTINCT FROM 'ativo' THEN
    RAISE EXCEPTION 'Só um colaborador ativo pode ser afastado.';
  END IF;
  SELECT id INTO v_aloc FROM public.pessoas_alocacoes
  WHERE colaborador_id = v_col AND fim IS NULL AND papel = 'ocupacao';
  IF v_aloc IS NULL THEN RAISE EXCEPTION 'A pessoa está fora das vagas do quadro.'; END IF;
  UPDATE public.pessoas_alocacoes
  SET papel = 'afastado', posicao_id = NULL, updated_at = now()
  WHERE id = v_aloc;
  UPDATE public.pessoas_colaboradores
  SET situacao = 'afastado', afastamento = p_motivo, updated_at = now()
  WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_retomar(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid; v_situacao text; v_turno uuid; v_setor uuid; v_operacional boolean;
  v_aloc uuid; v_pos uuid;
BEGIN
  SELECT id, situacao, turno_id, setor_id INTO v_col, v_situacao, v_turno, v_setor
  FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  IF v_situacao IS DISTINCT FROM 'afastado' THEN
    RAISE EXCEPTION 'Só um afastado pode voltar ao posto.';
  END IF;
  SELECT id INTO v_aloc FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_aloc IS NULL THEN RAISE EXCEPTION 'Não há alocação aberta para retomar.'; END IF;
  SELECT operacional INTO v_operacional FROM public.pessoas_turnos WHERE id = v_turno;
  IF v_operacional IS DISTINCT FROM true THEN
    UPDATE public.pessoas_alocacoes SET papel = 'apoio', posicao_id = NULL, updated_at = now() WHERE id = v_aloc;
    UPDATE public.pessoas_colaboradores SET situacao = 'ativo', afastamento = NULL, updated_at = now() WHERE id = v_col;
    RETURN;
  END IF;
  SELECT p.id INTO v_pos FROM public.pessoas_posicoes p
  WHERE p.turno_id = v_turno AND p.ativa
    AND NOT EXISTS (SELECT 1 FROM public.pessoas_alocacoes a WHERE a.posicao_id = p.id AND a.fim IS NULL)
  ORDER BY p.codigo LIMIT 1;
  IF v_pos IS NULL THEN RAISE EXCEPTION 'Sem vaga livre nesse turno.'; END IF;
  UPDATE public.pessoas_alocacoes
  SET papel = 'ocupacao', posicao_id = v_pos, updated_at = now()
  WHERE id = v_aloc;
  UPDATE public.pessoas_colaboradores
  SET situacao = 'ativo', afastamento = NULL, updated_at = now()
  WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_transferir(p_codigo text, p_turno text, p_lider boolean)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid; v_aloc uuid; v_turno uuid; v_setor uuid; v_operacional boolean; v_pos uuid;
  v_turno_atual uuid; v_situacao text; v_papel text;
BEGIN
  SELECT id, turno_id, situacao INTO v_col, v_turno_atual, v_situacao
  FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  SELECT id, setor_id, operacional INTO v_turno, v_setor, v_operacional
  FROM public.pessoas_turnos WHERE codigo = p_turno;
  IF v_turno IS NULL THEN RAISE EXCEPTION 'Turno não encontrado.'; END IF;
  IF v_turno_atual IS NOT DISTINCT FROM v_turno THEN
    UPDATE public.pessoas_colaboradores
    SET lider_setor = p_lider, updated_at = now()
    WHERE id = v_col;
    RETURN;
  END IF;
  SELECT id INTO v_aloc FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;
  v_papel := CASE
    WHEN NOT v_operacional THEN 'apoio'
    WHEN v_situacao = 'admissao_prevista' THEN 'reserva'
    WHEN v_situacao = 'afastado' THEN 'afastado'
    ELSE 'ocupacao'
  END;
  IF v_operacional AND v_situacao IS DISTINCT FROM 'afastado' THEN
    SELECT p.id INTO v_pos FROM public.pessoas_posicoes p
    WHERE p.turno_id = v_turno AND p.ativa
      AND NOT EXISTS (SELECT 1 FROM public.pessoas_alocacoes a WHERE a.posicao_id = p.id AND a.fim IS NULL)
    ORDER BY p.codigo LIMIT 1;
    IF v_pos IS NULL THEN RAISE EXCEPTION 'Sem vaga livre nesse turno.'; END IF;
    IF v_aloc IS NOT NULL THEN
      UPDATE public.pessoas_alocacoes SET fim = CURRENT_DATE, updated_at = now() WHERE id = v_aloc;
    END IF;
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, posicao_id, papel)
    VALUES (v_col, v_setor, v_turno, v_pos, v_papel);
  ELSE
    IF v_aloc IS NOT NULL THEN
      UPDATE public.pessoas_alocacoes SET fim = CURRENT_DATE, updated_at = now() WHERE id = v_aloc;
    END IF;
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, papel)
    VALUES (v_col, v_setor, v_turno, v_papel);
  END IF;
  UPDATE public.pessoas_colaboradores
  SET setor_id = v_setor, turno_id = v_turno, lider_setor = p_lider, updated_at = now()
  WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_desligar(p_codigo text, p_data date, p_tipo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid;
BEGIN
  IF p_tipo NOT IN ('com_trabalho', 'sem_trabalho') THEN
    RAISE EXCEPTION 'Informe se o aviso é com ou sem trabalho.';
  END IF;
  SELECT id INTO v_col FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  UPDATE public.pessoas_avisos
  SET situacao = 'encerrado', updated_at = now()
  WHERE colaborador_id = v_col AND situacao = 'ativo';
  IF p_data > CURRENT_DATE THEN
    UPDATE public.pessoas_colaboradores SET data_desligamento = p_data, updated_at = now() WHERE id = v_col;
    INSERT INTO public.pessoas_avisos (colaborador_id, tipo, inicio, ultimo_dia, termino, situacao)
    VALUES (v_col, p_tipo, CURRENT_DATE, p_data, p_data, 'ativo');
    RETURN;
  END IF;
  UPDATE public.pessoas_alocacoes SET fim = p_data, updated_at = now() WHERE colaborador_id = v_col AND fim IS NULL;
  INSERT INTO public.pessoas_avisos (colaborador_id, tipo, inicio, ultimo_dia, termino, situacao)
  VALUES (v_col, p_tipo, p_data, p_data, p_data, 'encerrado');
  UPDATE public.pessoas_colaboradores
  SET situacao = 'desligado', data_desligamento = p_data, afastamento = NULL, updated_at = now()
  WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_efetivar_desligamentos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_total integer;
BEGIN
  UPDATE public.pessoas_alocacoes AS alocacao
  SET fim = colaborador.data_desligamento, updated_at = now()
  FROM public.pessoas_colaboradores AS colaborador
  WHERE alocacao.colaborador_id = colaborador.id
    AND alocacao.fim IS NULL
    AND colaborador.situacao <> 'desligado'
    AND colaborador.data_desligamento IS NOT NULL
    AND colaborador.data_desligamento <= v_hoje;

  UPDATE public.pessoas_avisos AS aviso
  SET situacao = 'encerrado', updated_at = now()
  FROM public.pessoas_colaboradores AS colaborador
  WHERE aviso.colaborador_id = colaborador.id
    AND aviso.situacao = 'ativo'
    AND colaborador.situacao <> 'desligado'
    AND colaborador.data_desligamento IS NOT NULL
    AND colaborador.data_desligamento <= v_hoje;

  UPDATE public.pessoas_colaboradores
  SET situacao = 'desligado', afastamento = NULL, updated_at = now()
  WHERE situacao <> 'desligado'
    AND data_desligamento IS NOT NULL
    AND data_desligamento <= v_hoje;
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END $$;

REVOKE ALL ON FUNCTION public.pessoas_efetivar_desligamentos() FROM PUBLIC, anon, authenticated;
