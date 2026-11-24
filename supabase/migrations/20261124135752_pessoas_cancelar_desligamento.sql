-- Desfaz um desligamento já efetivado e devolve a pessoa à vaga do turno.

CREATE OR REPLACE FUNCTION public.pessoas_cancelar_desligamento(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid;
  v_situacao text;
  v_data date;
  v_setor uuid;
  v_turno uuid;
  v_aloc uuid;
  v_pos_antiga uuid;
  v_papel text;
  v_setor_aloc uuid;
  v_turno_aloc uuid;
  v_pos uuid;
  v_situacao_nova text;
BEGIN
  SELECT id, situacao, data_desligamento, setor_id, turno_id
  INTO v_col, v_situacao, v_data, v_setor, v_turno
  FROM public.pessoas_colaboradores
  WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  IF v_situacao IS DISTINCT FROM 'desligado' THEN
    RAISE EXCEPTION 'Só um desligado pode cancelar o desligamento.';
  END IF;

  SELECT id, posicao_id, papel, setor_id, turno_id
  INTO v_aloc, v_pos_antiga, v_papel, v_setor_aloc, v_turno_aloc
  FROM public.pessoas_alocacoes
  WHERE colaborador_id = v_col
  ORDER BY fim DESC NULLS LAST, created_at DESC
  LIMIT 1;
  IF FOUND THEN
    v_setor := v_setor_aloc;
    v_turno := v_turno_aloc;
  END IF;
  IF v_turno IS NULL OR v_setor IS NULL THEN
    RAISE EXCEPTION 'Colaborador sem turno. Não há vaga para devolver.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.pessoas_alocacoes
    WHERE colaborador_id = v_col AND fim IS NULL
  ) THEN
    RAISE EXCEPTION 'Este colaborador já tem alocação aberta.';
  END IF;

  IF v_pos_antiga IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pessoas_posicoes p
    WHERE p.id = v_pos_antiga
      AND p.ativa
      AND p.turno_id = v_turno
      AND NOT EXISTS (
        SELECT 1 FROM public.pessoas_alocacoes a
        WHERE a.posicao_id = p.id AND a.fim IS NULL
      )
  ) THEN
    v_pos := v_pos_antiga;
  ELSE
    SELECT p.id INTO v_pos
    FROM public.pessoas_posicoes p
    WHERE p.turno_id = v_turno
      AND p.ativa
      AND NOT EXISTS (
        SELECT 1 FROM public.pessoas_alocacoes a
        WHERE a.posicao_id = p.id AND a.fim IS NULL
      )
    ORDER BY p.codigo
    LIMIT 1;
  END IF;
  IF v_pos IS NULL THEN RAISE EXCEPTION 'Sem vaga livre nesse turno.'; END IF;

  v_situacao_nova := CASE WHEN v_papel = 'reserva' THEN 'admissao_prevista' ELSE 'ativo' END;
  IF v_aloc IS NOT NULL AND v_pos = v_pos_antiga AND v_papel IN ('ocupacao', 'reserva') THEN
    UPDATE public.pessoas_alocacoes
    SET fim = NULL, updated_at = now()
    WHERE id = v_aloc;
  ELSE
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, posicao_id, papel)
    VALUES (
      v_col,
      v_setor,
      v_turno,
      v_pos,
      CASE WHEN v_papel = 'reserva' THEN 'reserva' ELSE 'ocupacao' END
    );
  END IF;

  IF v_data IS NOT NULL THEN
    UPDATE public.pessoas_avisos
    SET situacao = 'cancelado', updated_at = now()
    WHERE id = (
      SELECT id FROM public.pessoas_avisos
      WHERE colaborador_id = v_col
        AND situacao = 'encerrado'
        AND termino IS NOT DISTINCT FROM v_data
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  UPDATE public.pessoas_colaboradores
  SET situacao = v_situacao_nova,
      data_desligamento = NULL,
      afastamento = NULL,
      setor_id = v_setor,
      turno_id = v_turno,
      updated_at = now()
  WHERE id = v_col;
END $$;
