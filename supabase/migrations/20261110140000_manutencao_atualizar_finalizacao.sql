-- Permite corrigir finalização: devolve consumo, reaplica peças/ajudantes e atualiza horários/serviços.

CREATE OR REPLACE FUNCTION public.manutencao_atualizar_finalizacao(
  p_ordem uuid,
  p_usuario uuid,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_servicos text,
  p_custo_pecas integer,
  p_pecas jsonb,
  p_ajudantes uuid[],
  p_administra boolean
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ordem public.manutencao_ordens%ROWTYPE;
  v_peca public.manutencao_pecas%ROWTYPE;
  v_antiga record;
  v_item record;
  v_faltando text[] := ARRAY[]::text[];
  v_soma integer := 0;
  v_unitario integer;
BEGIN
  IF p_inicio IS NULL
     OR p_fim IS NULL
     OR p_fim <= p_inicio
     OR p_servicos IS NULL
     OR btrim(p_servicos) = ''
     OR p_custo_pecas IS NULL
     OR p_custo_pecas < 0
     OR p_pecas IS NULL
     OR jsonb_typeof(p_pecas) <> 'array' THEN
    RAISE EXCEPTION 'Movimento inválido.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_pecas) AS item(peca_id uuid)
    GROUP BY item.peca_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Movimento inválido.';
  END IF;

  SELECT * INTO v_ordem
  FROM public.manutencao_ordens
  WHERE id = p_ordem
  FOR UPDATE;

  IF NOT FOUND OR v_ordem.status IS DISTINCT FROM 'finalizada' THEN
    RAISE EXCEPTION 'Ordem não está finalizada.';
  END IF;

  IF p_administra IS NOT TRUE
     AND v_ordem.recebida_por IS DISTINCT FROM p_usuario THEN
    RAISE EXCEPTION 'Só quem recebeu ou quem administra edita a finalização.';
  END IF;

  FOR v_antiga IN
    SELECT peca_id, quantidade
    FROM public.manutencao_ordem_pecas
    WHERE ordem_id = p_ordem
    ORDER BY peca_id
    FOR UPDATE
  LOOP
    SELECT * INTO v_peca
    FROM public.manutencao_pecas
    WHERE id = v_antiga.peca_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Peça não encontrada.';
    END IF;

    PERFORM set_config('manutencao.movimento', '1', true);

    UPDATE public.manutencao_pecas AS peca
    SET saldo = peca.saldo + v_antiga.quantidade
    WHERE peca.id = v_antiga.peca_id;
  END LOOP;

  DELETE FROM public.manutencao_estoque_movimentos
  WHERE ordem_id = p_ordem
    AND tipo = 'consumo_os';

  DELETE FROM public.manutencao_ordem_pecas
  WHERE ordem_id = p_ordem;

  DELETE FROM public.manutencao_ordem_ajudantes
  WHERE ordem_id = p_ordem;

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_pecas) AS item(
      peca_id uuid,
      quantidade numeric,
      custo_unitario integer,
      custo_total integer,
      saldo_esperado numeric,
      custo_esperado integer,
      saldo_novo numeric
    )
    ORDER BY item.peca_id
  LOOP
    SELECT * INTO v_peca
    FROM public.manutencao_pecas
    WHERE id = v_item.peca_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Peça não encontrada.';
    END IF;

    IF v_item.quantidade IS NULL
       OR v_item.quantidade <= 0
       OR v_item.quantidade IS DISTINCT FROM trunc(v_item.quantidade, 3) THEN
      RAISE EXCEPTION 'Informe uma quantidade maior que zero, com até 3 casas.';
    END IF;

    IF v_peca.saldo IS DISTINCT FROM v_item.saldo_esperado
       OR v_peca.custo_medio_centavos IS DISTINCT FROM v_item.custo_esperado THEN
      RAISE EXCEPTION 'Estoque mudou. Tente de novo.';
    END IF;

    v_unitario := COALESCE(v_peca.custo_medio_centavos, 0);

    IF v_item.custo_unitario IS DISTINCT FROM v_unitario
       OR v_item.custo_total IS NULL
       OR v_item.custo_total < 0
       OR v_item.saldo_novo IS DISTINCT FROM (v_peca.saldo - v_item.quantidade) THEN
      RAISE EXCEPTION 'Movimento inválido.';
    END IF;

    PERFORM set_config('manutencao.movimento', '1', true);

    UPDATE public.manutencao_pecas AS peca
    SET saldo = v_item.saldo_novo
    WHERE peca.id = v_peca.id;

    INSERT INTO public.manutencao_estoque_movimentos (
      peca_id,
      tipo,
      quantidade,
      preco_unitario_centavos,
      ordem_id,
      motivo,
      usuario_id
    ) VALUES (
      v_peca.id,
      'consumo_os',
      v_item.quantidade,
      v_unitario,
      p_ordem,
      NULL,
      p_usuario
    );

    INSERT INTO public.manutencao_ordem_pecas (
      ordem_id,
      peca_id,
      quantidade,
      custo_unitario_centavos,
      custo_total_centavos
    ) VALUES (
      p_ordem,
      v_peca.id,
      v_item.quantidade,
      v_item.custo_unitario,
      v_item.custo_total
    );

    v_soma := v_soma + v_item.custo_total;

    IF v_item.saldo_novo < 0 THEN
      v_faltando := array_append(v_faltando, v_peca.codigo);
    END IF;
  END LOOP;

  IF p_custo_pecas IS DISTINCT FROM v_soma THEN
    RAISE EXCEPTION 'Movimento inválido.';
  END IF;

  INSERT INTO public.manutencao_ordem_ajudantes (ordem_id, usuario_id)
  SELECT p_ordem, ajudante
  FROM unnest(COALESCE(p_ajudantes, ARRAY[]::uuid[])) AS ajudante;

  UPDATE public.manutencao_ordens
  SET inicio_em = p_inicio,
      fim_em = p_fim,
      servicos = btrim(p_servicos),
      custo_pecas_centavos = p_custo_pecas,
      updated_at = now()
  WHERE id = p_ordem;

  RETURN v_faltando;
END;
$$;

REVOKE ALL ON FUNCTION public.manutencao_atualizar_finalizacao(
  uuid, uuid, timestamptz, timestamptz, text, integer, jsonb, uuid[], boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.manutencao_atualizar_finalizacao(
  uuid, uuid, timestamptz, timestamptz, text, integer, jsonb, uuid[], boolean
) TO service_role;
