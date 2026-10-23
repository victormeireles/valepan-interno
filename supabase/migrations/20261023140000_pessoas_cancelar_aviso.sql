CREATE OR REPLACE FUNCTION public.pessoas_cancelar_aviso(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid;
  v_aviso uuid;
BEGIN
  SELECT id INTO v_col FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;

  SELECT id INTO v_aviso
  FROM public.pessoas_avisos
  WHERE colaborador_id = v_col AND situacao = 'ativo'
  LIMIT 1;
  IF v_aviso IS NULL THEN RAISE EXCEPTION 'Não há aviso ativo para cancelar.'; END IF;

  UPDATE public.pessoas_avisos
  SET situacao = 'cancelado', updated_at = now()
  WHERE colaborador_id = v_col AND situacao = 'ativo';

  UPDATE public.pessoas_colaboradores
  SET data_desligamento = NULL, updated_at = now()
  WHERE id = v_col;
END $$;
