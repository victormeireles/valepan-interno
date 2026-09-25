ALTER TABLE public.pessoas_colaboradores
  ADD COLUMN lider_setor boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX pessoas_colaboradores_lider_setor_uidx
  ON public.pessoas_colaboradores (setor_id)
  WHERE lider_setor AND situacao <> 'desligado' AND setor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.pessoas_definir_lider(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_col uuid; v_setor uuid;
BEGIN
  SELECT id, setor_id INTO v_col, v_setor FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  IF v_setor IS NULL THEN RAISE EXCEPTION 'A pessoa não tem setor.'; END IF;
  UPDATE public.pessoas_colaboradores SET lider_setor = false, updated_at = now()
  WHERE setor_id = v_setor AND lider_setor;
  UPDATE public.pessoas_colaboradores SET lider_setor = true, updated_at = now() WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_admitir_novo(p_nome text, p_turno text, p_data date)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_turno uuid; v_setor uuid; v_operacional boolean; v_pos uuid; v_codigo text; v_col uuid; v_seq int;
BEGIN
  IF length(trim(p_nome)) < 3 THEN RAISE EXCEPTION 'Informe o nome.'; END IF;
  SELECT id, setor_id, operacional INTO v_turno, v_setor, v_operacional
  FROM public.pessoas_turnos WHERE codigo = p_turno;
  IF v_turno IS NULL THEN RAISE EXCEPTION 'Turno não encontrado.'; END IF;
  SELECT COALESCE(MAX(substring(codigo from 4)::int), 0) + 1 INTO v_seq
  FROM public.pessoas_colaboradores WHERE codigo ~ '^VP-[0-9]+$';
  v_codigo := 'VP-' || lpad(v_seq::text, 4, '0');
  INSERT INTO public.pessoas_colaboradores (codigo, nome, situacao, setor_id, turno_id, data_admissao)
  VALUES (v_codigo, trim(p_nome), 'ativo', v_setor, v_turno, p_data)
  RETURNING id INTO v_col;
  IF v_operacional THEN
    SELECT p.id INTO v_pos FROM public.pessoas_posicoes p
    WHERE p.turno_id = v_turno AND p.ativa
      AND NOT EXISTS (
        SELECT 1 FROM public.pessoas_alocacoes a WHERE a.posicao_id = p.id AND a.fim IS NULL
      )
    ORDER BY p.codigo LIMIT 1;
    IF v_pos IS NULL THEN RAISE EXCEPTION 'Sem vaga livre nesse turno.'; END IF;
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, posicao_id, papel)
    VALUES (v_col, v_setor, v_turno, v_pos, 'ocupacao');
  ELSE
    INSERT INTO public.pessoas_alocacoes (colaborador_id, setor_id, turno_id, papel)
    VALUES (v_col, v_setor, v_turno, 'apoio');
  END IF;
  RETURN v_codigo;
END $$;
