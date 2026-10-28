-- Contratar com data futura só grava a data e mantém a pessoa a entrar.
-- Data de hoje ou anterior efetiva e ocupa a vaga.

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

UPDATE public.pessoas_colaboradores
SET situacao = 'admissao_prevista', updated_at = now()
WHERE situacao = 'ativo'
  AND data_admissao > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;

UPDATE public.pessoas_alocacoes AS alocacao
SET papel = 'reserva', updated_at = now()
FROM public.pessoas_colaboradores AS colaborador
WHERE alocacao.colaborador_id = colaborador.id
  AND alocacao.fim IS NULL
  AND alocacao.papel = 'ocupacao'
  AND colaborador.situacao = 'admissao_prevista'
  AND colaborador.data_admissao > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
