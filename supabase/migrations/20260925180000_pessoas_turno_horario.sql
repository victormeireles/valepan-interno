-- Salvar horário e vagas de um turno, ou criar um turno novo. Sem DELETE.

CREATE OR REPLACE FUNCTION public.pessoas_salvar_turno(
  p_codigo text,
  p_setor text,
  p_nome text,
  p_vagas int,
  p_dias jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_turno uuid;
  v_setor uuid;
  v_tipo text;
  v_ocupadas int;
  v_ativas int;
  v_proximo int;
  v_i int;
BEGIN
  IF btrim(p_nome) = '' THEN RAISE EXCEPTION 'Informe o nome do turno.'; END IF;
  IF p_vagas < 0 OR p_vagas > 40 THEN RAISE EXCEPTION 'A quantidade de vagas fica entre 0 e 40.'; END IF;
  IF jsonb_array_length(p_dias) <> 6 THEN RAISE EXCEPTION 'Informe o horário de segunda a sábado.'; END IF;

  SELECT id INTO v_turno FROM public.pessoas_turnos WHERE codigo = p_codigo;
  IF v_turno IS NULL THEN
    SELECT id, tipo INTO v_setor, v_tipo FROM public.pessoas_setores WHERE codigo = p_setor AND ativo;
    IF v_setor IS NULL THEN RAISE EXCEPTION 'Setor não encontrado.'; END IF;
    INSERT INTO public.pessoas_turnos (codigo, setor_id, nome, operacional, ativo)
    VALUES (p_codigo, v_setor, btrim(p_nome), v_tipo = 'operacional', true)
    RETURNING id INTO v_turno;
  ELSE
    UPDATE public.pessoas_turnos SET nome = btrim(p_nome), ativo = true, updated_at = now() WHERE id = v_turno;
  END IF;

  INSERT INTO public.pessoas_turno_dias (turno_id, dia, inicio, fim, termina_dia_seguinte, situacao)
  SELECT v_turno,
    (dia->>'dia')::smallint,
    NULLIF(dia->>'inicio', '')::time,
    NULLIF(dia->>'fim', '')::time,
    COALESCE((dia->>'terminaDiaSeguinte')::boolean, false),
    dia->>'situacao'
  FROM jsonb_array_elements(p_dias) dia
  ON CONFLICT (turno_id, dia) DO UPDATE SET
    inicio = EXCLUDED.inicio,
    fim = EXCLUDED.fim,
    termina_dia_seguinte = EXCLUDED.termina_dia_seguinte,
    situacao = EXCLUDED.situacao,
    updated_at = now();

  SELECT count(*) INTO v_ocupadas
  FROM public.pessoas_alocacoes a
  JOIN public.pessoas_posicoes p ON p.id = a.posicao_id
  WHERE p.turno_id = v_turno AND a.fim IS NULL;
  IF p_vagas < v_ocupadas THEN
    RAISE EXCEPTION 'Há % pessoa(s) no turno. Dá para reduzir só as vagas livres.', v_ocupadas;
  END IF;

  SELECT count(*) INTO v_ativas FROM public.pessoas_posicoes WHERE turno_id = v_turno AND ativa;
  IF p_vagas > v_ativas THEN
    SELECT COALESCE(MAX(substring(codigo FROM '-([0-9]+)$')::int), 0) INTO v_proximo
    FROM public.pessoas_posicoes WHERE turno_id = v_turno;
    FOR v_i IN 1..(p_vagas - v_ativas) LOOP
      INSERT INTO public.pessoas_posicoes (codigo, setor_id, turno_id, ativa)
      SELECT p_codigo || '-' || lpad((v_proximo + v_i)::text, 2, '0'), t.setor_id, t.id, true
      FROM public.pessoas_turnos t WHERE t.id = v_turno;
    END LOOP;
  ELSIF p_vagas < v_ativas THEN
    UPDATE public.pessoas_posicoes SET ativa = false, updated_at = now()
    WHERE id IN (
      SELECT p.id FROM public.pessoas_posicoes p
      WHERE p.turno_id = v_turno AND p.ativa
        AND NOT EXISTS (
          SELECT 1 FROM public.pessoas_alocacoes a WHERE a.posicao_id = p.id AND a.fim IS NULL
        )
      ORDER BY p.codigo DESC
      LIMIT (v_ativas - p_vagas)
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_remover_turno(p_codigo text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE v_turno uuid;
BEGIN
  SELECT id INTO v_turno FROM public.pessoas_turnos WHERE codigo = p_codigo AND ativo;
  IF v_turno IS NULL THEN RAISE EXCEPTION 'Turno não encontrado.'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.pessoas_alocacoes WHERE turno_id = v_turno AND fim IS NULL
  ) THEN
    RAISE EXCEPTION 'Há pessoas neste turno. Transfira ou desligue antes de remover.';
  END IF;
  UPDATE public.pessoas_posicoes SET ativa = false, updated_at = now() WHERE turno_id = v_turno AND ativa;
  UPDATE public.pessoas_turnos SET ativo = false, updated_at = now() WHERE id = v_turno;
END $$;
