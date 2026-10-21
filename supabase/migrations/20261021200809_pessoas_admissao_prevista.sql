-- Data em branco ou futura entra como admissão prevista e segura a vaga.
-- Data de hoje ou anterior admite na hora.

CREATE OR REPLACE FUNCTION public.pessoas_admitir_novo(p_nome text, p_turno text, p_data date)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_turno uuid; v_setor uuid; v_operacional boolean; v_pos uuid;
  v_codigo text; v_col uuid; v_seq int; v_hoje date; v_prevista boolean; v_papel text;
BEGIN
  IF length(trim(p_nome)) < 3 THEN RAISE EXCEPTION 'Informe o nome.'; END IF;
  v_hoje := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
  v_prevista := p_data IS NULL OR p_data > v_hoje;
  SELECT id, setor_id, operacional INTO v_turno, v_setor, v_operacional
  FROM public.pessoas_turnos WHERE codigo = p_turno;
  IF v_turno IS NULL THEN RAISE EXCEPTION 'Turno não encontrado.'; END IF;
  SELECT COALESCE(MAX(substring(codigo from 4)::int), 0) + 1 INTO v_seq
  FROM public.pessoas_colaboradores WHERE codigo ~ '^VP-[0-9]+$';
  v_codigo := 'VP-' || lpad(v_seq::text, 4, '0');
  INSERT INTO public.pessoas_colaboradores (codigo, nome, situacao, setor_id, turno_id, data_admissao)
  VALUES (
    v_codigo,
    trim(p_nome),
    CASE WHEN v_prevista THEN 'admissao_prevista' ELSE 'ativo' END,
    v_setor,
    v_turno,
    p_data
  )
  RETURNING id INTO v_col;
  IF v_operacional THEN
    SELECT p.id INTO v_pos FROM public.pessoas_posicoes p
    WHERE p.turno_id = v_turno AND p.ativa
      AND NOT EXISTS (
        SELECT 1 FROM public.pessoas_alocacoes a WHERE a.posicao_id = p.id AND a.fim IS NULL
      )
    ORDER BY p.codigo LIMIT 1;
    IF v_pos IS NULL THEN RAISE EXCEPTION 'Sem vaga livre nesse turno.'; END IF;
    v_papel := CASE WHEN v_prevista THEN 'reserva' ELSE 'ocupacao' END;
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, posicao_id, papel)
    VALUES (v_col, v_setor, v_turno, v_pos, v_papel);
  ELSE
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, papel)
    VALUES (v_col, v_setor, v_turno, 'apoio');
  END IF;
  RETURN v_codigo;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_admitir(p_codigo text, p_data date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid; v_papel text; v_situacao text;
BEGIN
  IF p_data IS NULL THEN RAISE EXCEPTION 'Informe a data de admissão.'; END IF;
  SELECT id, situacao INTO v_col, v_situacao FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  SELECT papel INTO v_papel FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_papel = 'reserva' THEN
    UPDATE public.pessoas_alocacoes SET papel = 'ocupacao', updated_at = now()
    WHERE colaborador_id = v_col AND fim IS NULL;
  ELSIF v_papel IS DISTINCT FROM 'apoio' OR v_situacao IS DISTINCT FROM 'admissao_prevista' THEN
    RAISE EXCEPTION 'Só uma reserva em vaga pode virar admissão.';
  END IF;
  UPDATE public.pessoas_colaboradores
  SET situacao = 'ativo', data_admissao = p_data, updated_at = now()
  WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_desistir(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid; v_papel text; v_situacao text;
BEGIN
  SELECT id, situacao INTO v_col, v_situacao FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  SELECT papel INTO v_papel FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_papel IS DISTINCT FROM 'reserva'
     AND (v_papel IS DISTINCT FROM 'apoio' OR v_situacao IS DISTINCT FROM 'admissao_prevista') THEN
    RAISE EXCEPTION 'Não há reserva ativa para desistir.';
  END IF;
  UPDATE public.pessoas_alocacoes SET fim = CURRENT_DATE, updated_at = now()
  WHERE colaborador_id = v_col AND fim IS NULL;
  UPDATE public.pessoas_colaboradores SET previsao_encerrada_em = now(), updated_at = now() WHERE id = v_col;
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
  IF v_aloc IS NULL THEN RAISE EXCEPTION 'A pessoa não tem alocação aberta.'; END IF;
  v_papel := CASE
    WHEN NOT v_operacional THEN 'apoio'
    WHEN v_situacao = 'admissao_prevista' THEN 'reserva'
    ELSE 'ocupacao'
  END;
  IF v_operacional THEN
    SELECT p.id INTO v_pos FROM public.pessoas_posicoes p
    WHERE p.turno_id = v_turno AND p.ativa
      AND NOT EXISTS (SELECT 1 FROM public.pessoas_alocacoes a WHERE a.posicao_id = p.id AND a.fim IS NULL)
    ORDER BY p.codigo LIMIT 1;
    IF v_pos IS NULL THEN RAISE EXCEPTION 'Sem vaga livre nesse turno.'; END IF;
    UPDATE public.pessoas_alocacoes SET fim = CURRENT_DATE, updated_at = now() WHERE id = v_aloc;
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, posicao_id, papel)
    VALUES (v_col, v_setor, v_turno, v_pos, v_papel);
  ELSE
    UPDATE public.pessoas_alocacoes SET fim = CURRENT_DATE, updated_at = now() WHERE id = v_aloc;
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, papel)
    VALUES (v_col, v_setor, v_turno, v_papel);
  END IF;
  UPDATE public.pessoas_colaboradores
  SET setor_id = v_setor, turno_id = v_turno, lider_setor = p_lider, updated_at = now()
  WHERE id = v_col;
END $$;
