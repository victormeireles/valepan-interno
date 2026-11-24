-- Apaga a ordem e desfaz o consumo. A peça continua cadastrada; só o saldo volta.

CREATE OR REPLACE FUNCTION public.manutencao_remover_ordem(p_ordem uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_antiga record;
  v_peca public.manutencao_pecas%ROWTYPE;
BEGIN
  PERFORM 1
  FROM public.manutencao_ordens
  WHERE id = p_ordem
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem não encontrada.';
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

  DELETE FROM public.manutencao_ordens
  WHERE id = p_ordem;
END;
$$;

REVOKE ALL ON FUNCTION public.manutencao_remover_ordem(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.manutencao_remover_ordem(uuid)
  TO service_role;
