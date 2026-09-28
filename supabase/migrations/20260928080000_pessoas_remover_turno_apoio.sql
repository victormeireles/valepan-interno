-- Apoio não ocupa vaga. Remover o turno encerra só essas alocações.

CREATE OR REPLACE FUNCTION public.pessoas_remover_turno(p_codigo text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE v_turno uuid;
BEGIN
  SELECT id INTO v_turno FROM public.pessoas_turnos WHERE codigo = p_codigo AND ativo;
  IF v_turno IS NULL THEN RAISE EXCEPTION 'Turno não encontrado.'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.pessoas_alocacoes
    WHERE turno_id = v_turno AND fim IS NULL AND papel <> 'apoio'
  ) THEN
    RAISE EXCEPTION 'Há pessoas neste turno. Transfira ou desligue antes de remover.';
  END IF;

  UPDATE public.pessoas_colaboradores
  SET turno_id = NULL, updated_at = now()
  WHERE id IN (
    SELECT colaborador_id FROM public.pessoas_alocacoes
    WHERE turno_id = v_turno AND fim IS NULL AND papel = 'apoio'
  );

  UPDATE public.pessoas_alocacoes
  SET fim = CURRENT_DATE, updated_at = now()
  WHERE turno_id = v_turno AND fim IS NULL AND papel = 'apoio';

  UPDATE public.pessoas_posicoes SET ativa = false, updated_at = now() WHERE turno_id = v_turno AND ativa;
  UPDATE public.pessoas_turnos SET ativo = false, updated_at = now() WHERE id = v_turno;
END $$;
