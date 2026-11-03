-- Apoio passa a ocupar vaga como o operacional.
-- Tipo do setor/turno.operacional só classifica o filtro "Somente operacional".

DO $$
DECLARE
  r record;
  v_pos uuid;
  v_ativas int;
  v_ocupadas int;
  v_faltam int;
  v_proximo int;
  v_i int;
  v_papel text;
BEGIN
  FOR r IN
    SELECT t.id AS turno_id, t.codigo AS turno_codigo, t.setor_id, count(*)::int AS qtd
    FROM public.pessoas_alocacoes a
    JOIN public.pessoas_turnos t ON t.id = a.turno_id
    WHERE a.fim IS NULL AND a.papel = 'apoio'
    GROUP BY t.id, t.codigo, t.setor_id
  LOOP
    SELECT count(*) INTO v_ativas
    FROM public.pessoas_posicoes WHERE turno_id = r.turno_id AND ativa;
    SELECT count(*) INTO v_ocupadas
    FROM public.pessoas_alocacoes a
    JOIN public.pessoas_posicoes p ON p.id = a.posicao_id
    WHERE p.turno_id = r.turno_id AND a.fim IS NULL;
    v_faltam := (v_ocupadas + r.qtd) - v_ativas;
    IF v_faltam > 0 THEN
      SELECT COALESCE(MAX(substring(codigo FROM '-([0-9]+)$')::int), 0) INTO v_proximo
      FROM public.pessoas_posicoes WHERE turno_id = r.turno_id;
      FOR v_i IN 1..v_faltam LOOP
        INSERT INTO public.pessoas_posicoes (codigo, setor_id, turno_id, ativa)
        VALUES (
          r.turno_codigo || '-' || lpad((v_proximo + v_i)::text, 2, '0'),
          r.setor_id,
          r.turno_id,
          true
        );
      END LOOP;
    END IF;
  END LOOP;

  FOR r IN
    SELECT a.id AS aloc_id, a.turno_id, c.situacao
    FROM public.pessoas_alocacoes a
    JOIN public.pessoas_colaboradores c ON c.id = a.colaborador_id
    WHERE a.fim IS NULL AND a.papel = 'apoio'
    ORDER BY a.id
  LOOP
    v_papel := CASE
      WHEN r.situacao = 'admissao_prevista' THEN 'reserva'
      WHEN r.situacao = 'afastado' THEN 'afastado'
      ELSE 'ocupacao'
    END;
    IF v_papel = 'afastado' THEN
      UPDATE public.pessoas_alocacoes
      SET papel = 'afastado', posicao_id = NULL, updated_at = now()
      WHERE id = r.aloc_id;
      CONTINUE;
    END IF;
    SELECT p.id INTO v_pos
    FROM public.pessoas_posicoes p
    WHERE p.turno_id = r.turno_id AND p.ativa
      AND NOT EXISTS (
        SELECT 1 FROM public.pessoas_alocacoes x
        WHERE x.posicao_id = p.id AND x.fim IS NULL
      )
    ORDER BY p.codigo
    LIMIT 1;
    IF v_pos IS NULL THEN
      RAISE EXCEPTION 'Falha ao converter apoio em vaga (turno %).', r.turno_id;
    END IF;
    UPDATE public.pessoas_alocacoes
    SET papel = v_papel, posicao_id = v_pos, updated_at = now()
    WHERE id = r.aloc_id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_admitir_novo(p_nome text, p_turno text, p_data date)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_turno uuid; v_setor uuid; v_pos uuid;
  v_codigo text; v_col uuid; v_seq int; v_hoje date; v_prevista boolean; v_papel text;
BEGIN
  IF length(trim(p_nome)) < 3 THEN RAISE EXCEPTION 'Informe o nome.'; END IF;
  v_hoje := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
  v_prevista := p_data IS NULL OR p_data > v_hoje;
  SELECT id, setor_id INTO v_turno, v_setor
  FROM public.pessoas_turnos WHERE codigo = p_turno;
  IF v_turno IS NULL THEN RAISE EXCEPTION 'Turno não encontrado.'; END IF;
  SELECT COALESCE(MAX(substring(codigo from 4)::int), 0) + 1 INTO v_seq
  FROM public.pessoas_colaboradores WHERE codigo ~ '^VP-[0-9]+$';
  v_codigo := 'VP-' || lpad(v_seq::text, 4, '0');
  SELECT p.id INTO v_pos FROM public.pessoas_posicoes p
  WHERE p.turno_id = v_turno AND p.ativa
    AND NOT EXISTS (
      SELECT 1 FROM public.pessoas_alocacoes a WHERE a.posicao_id = p.id AND a.fim IS NULL
    )
  ORDER BY p.codigo LIMIT 1;
  IF v_pos IS NULL THEN RAISE EXCEPTION 'Sem vaga livre nesse turno.'; END IF;
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
  v_papel := CASE WHEN v_prevista THEN 'reserva' ELSE 'ocupacao' END;
  INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, posicao_id, papel)
  VALUES (v_col, v_setor, v_turno, v_pos, v_papel);
  RETURN v_codigo;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_admitir(p_codigo text, p_data date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid; v_papel text; v_situacao text; v_hoje date;
BEGIN
  IF p_data IS NULL THEN RAISE EXCEPTION 'Informe a data de admissão.'; END IF;
  v_hoje := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
  SELECT id, situacao INTO v_col, v_situacao FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  SELECT papel INTO v_papel FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;

  IF p_data > v_hoje THEN
    IF v_situacao IS DISTINCT FROM 'admissao_prevista' THEN
      RAISE EXCEPTION 'Só uma admissão prevista pode ter a data ajustada.';
    END IF;
    UPDATE public.pessoas_colaboradores
    SET data_admissao = p_data, updated_at = now()
    WHERE id = v_col;
    RETURN;
  END IF;

  IF v_papel IS DISTINCT FROM 'reserva' THEN
    RAISE EXCEPTION 'Só uma reserva em vaga pode virar admissão.';
  END IF;
  UPDATE public.pessoas_alocacoes SET papel = 'ocupacao', updated_at = now()
  WHERE colaborador_id = v_col AND fim IS NULL;
  UPDATE public.pessoas_colaboradores
  SET situacao = 'ativo', data_admissao = p_data, updated_at = now()
  WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_desistir(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid; v_papel text;
BEGIN
  SELECT id INTO v_col FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  SELECT papel INTO v_papel FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_papel IS DISTINCT FROM 'reserva' THEN
    RAISE EXCEPTION 'Não há reserva ativa para desistir.';
  END IF;
  UPDATE public.pessoas_alocacoes SET fim = CURRENT_DATE, updated_at = now()
  WHERE colaborador_id = v_col AND fim IS NULL;
  UPDATE public.pessoas_colaboradores SET previsao_encerrada_em = now(), updated_at = now() WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_retomar(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid; v_situacao text; v_turno uuid; v_aloc uuid; v_pos uuid;
BEGIN
  SELECT id, situacao, turno_id INTO v_col, v_situacao, v_turno
  FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  IF v_situacao IS DISTINCT FROM 'afastado' THEN
    RAISE EXCEPTION 'Só um afastado pode voltar ao posto.';
  END IF;
  SELECT id INTO v_aloc FROM public.pessoas_alocacoes WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_aloc IS NULL THEN RAISE EXCEPTION 'Não há alocação aberta para retomar.'; END IF;
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
  v_col uuid; v_aloc uuid; v_turno uuid; v_setor uuid; v_pos uuid;
  v_turno_atual uuid; v_situacao text; v_papel text;
BEGIN
  SELECT id, turno_id, situacao INTO v_col, v_turno_atual, v_situacao
  FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  SELECT id, setor_id INTO v_turno, v_setor
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
    WHEN v_situacao = 'admissao_prevista' THEN 'reserva'
    WHEN v_situacao = 'afastado' THEN 'afastado'
    ELSE 'ocupacao'
  END;
  IF v_situacao IS DISTINCT FROM 'afastado' THEN
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

CREATE OR REPLACE FUNCTION public.pessoas_remover_turno(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_turno uuid;
BEGIN
  SELECT id INTO v_turno FROM public.pessoas_turnos WHERE codigo = p_codigo AND ativo;
  IF v_turno IS NULL THEN RAISE EXCEPTION 'Turno não encontrado.'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.pessoas_alocacoes
    WHERE turno_id = v_turno AND fim IS NULL
  ) THEN
    RAISE EXCEPTION 'Há pessoas neste turno. Transfira ou desligue antes de remover.';
  END IF;
  UPDATE public.pessoas_posicoes SET ativa = false, updated_at = now() WHERE turno_id = v_turno AND ativa;
  UPDATE public.pessoas_turnos SET ativo = false, updated_at = now() WHERE id = v_turno;
END $$;
