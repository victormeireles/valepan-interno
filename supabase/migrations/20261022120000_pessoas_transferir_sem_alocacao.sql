-- Permite transferir colaborador sem alocação aberta (cria ocupação nova).
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
    ELSE 'ocupacao'
  END;
  IF v_operacional THEN
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
