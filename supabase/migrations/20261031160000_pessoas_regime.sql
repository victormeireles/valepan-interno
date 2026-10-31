ALTER TABLE public.pessoas_colaboradores
  ADD COLUMN regime text NOT NULL DEFAULT 'clt',
  ADD COLUMN cnpj text NULL,
  ADD COLUMN razao_social text NULL;

ALTER TABLE public.pessoas_colaboradores
  ADD CONSTRAINT pessoas_colaboradores_regime_check CHECK (regime IN ('clt', 'pj')),
  ADD CONSTRAINT pessoas_colaboradores_cnpj_digitos_check CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),
  ADD CONSTRAINT pessoas_colaboradores_razao_social_check CHECK (razao_social IS NULL OR char_length(razao_social) <= 200),
  ADD CONSTRAINT pessoas_colaboradores_regime_clt_check CHECK (
    regime = 'pj' OR (cnpj IS NULL AND razao_social IS NULL)
  );

CREATE OR REPLACE FUNCTION public.pessoas_desligar(p_codigo text, p_data date, p_tipo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid;
  v_regime text;
BEGIN
  SELECT id, regime INTO v_col, v_regime FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  IF v_regime IS DISTINCT FROM 'pj' AND p_tipo NOT IN ('com_trabalho', 'sem_trabalho') THEN
    RAISE EXCEPTION 'Informe se o aviso é com ou sem trabalho.';
  END IF;
  UPDATE public.pessoas_avisos
  SET situacao = 'encerrado', updated_at = now()
  WHERE colaborador_id = v_col AND situacao = 'ativo';
  IF p_data > CURRENT_DATE THEN
    UPDATE public.pessoas_colaboradores SET data_desligamento = p_data, updated_at = now() WHERE id = v_col;
    IF v_regime IS DISTINCT FROM 'pj' THEN
      INSERT INTO public.pessoas_avisos (colaborador_id, tipo, inicio, ultimo_dia, termino, situacao)
      VALUES (v_col, p_tipo, CURRENT_DATE, p_data, p_data, 'ativo');
    END IF;
    RETURN;
  END IF;
  UPDATE public.pessoas_alocacoes SET fim = p_data, updated_at = now() WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_regime IS DISTINCT FROM 'pj' THEN
    INSERT INTO public.pessoas_avisos (colaborador_id, tipo, inicio, ultimo_dia, termino, situacao)
    VALUES (v_col, p_tipo, p_data, p_data, p_data, 'encerrado');
  END IF;
  UPDATE public.pessoas_colaboradores
  SET situacao = 'desligado', data_desligamento = p_data, afastamento = NULL, updated_at = now()
  WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_cancelar_saida(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.pessoas_colaboradores
  SET data_desligamento = NULL, updated_at = now()
  WHERE codigo = p_codigo
    AND regime = 'pj'
    AND situacao <> 'desligado'
    AND data_desligamento IS NOT NULL;
  IF FOUND THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pessoas_colaboradores WHERE codigo = p_codigo) THEN
    RAISE EXCEPTION 'Colaborador não encontrado.';
  END IF;
  RAISE EXCEPTION 'Não há saída prevista para cancelar.';
END $$;
