DROP FUNCTION IF EXISTS public.pessoas_avisar(text, text, date, date, date, text);
DROP FUNCTION IF EXISTS public.pessoas_desligar(text, date);

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
  SET situacao = 'desligado', data_desligamento = p_data, updated_at = now()
  WHERE id = v_col;
END $$;
