-- Saldo e custo da peça só mudam nesta transação. A média ponderada não é recalculada aqui.

CREATE TABLE public.manutencao_pecas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL CHECK (btrim(codigo) <> ''),
  nome text NOT NULL CHECK (btrim(nome) <> ''),
  unidade text NOT NULL DEFAULT 'UN' CHECK (btrim(unidade) <> ''),
  saldo numeric(14,3) NOT NULL DEFAULT 0,
  custo_medio_centavos integer NULL CHECK (
    custo_medio_centavos IS NULL OR custo_medio_centavos >= 0
  ),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX manutencao_pecas_codigo_uidx
  ON public.manutencao_pecas (lower(btrim(codigo)));

CREATE TABLE public.manutencao_estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peca_id uuid NOT NULL REFERENCES public.manutencao_pecas(id),
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida_manual', 'consumo_os')),
  quantidade numeric(14,3) NOT NULL CHECK (quantidade > 0),
  preco_unitario_centavos integer NOT NULL CHECK (preco_unitario_centavos >= 0),
  ordem_id uuid NULL,
  motivo text NULL,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manutencao_estoque_movimentos_ordem CHECK (
    (tipo = 'consumo_os' AND ordem_id IS NOT NULL)
    OR (tipo <> 'consumo_os' AND ordem_id IS NULL)
  ),
  CONSTRAINT manutencao_estoque_movimentos_motivo CHECK (
    (tipo = 'saida_manual' AND btrim(motivo) <> '')
    OR (tipo <> 'saida_manual' AND motivo IS NULL)
  )
);

ALTER TABLE public.manutencao_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencao_estoque_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY manutencao_pecas_select ON public.manutencao_pecas
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_pecas_insert ON public.manutencao_pecas
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
      OR (SELECT is_admin())
    )
    AND saldo = 0
    AND custo_medio_centavos IS NULL
  );

CREATE POLICY manutencao_pecas_update ON public.manutencao_pecas
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_estoque_movimentos_select
  ON public.manutencao_estoque_movimentos
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
    OR (SELECT is_admin())
  );

CREATE OR REPLACE FUNCTION public.manutencao_pecas_impede_saldo_direto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.saldo IS DISTINCT FROM OLD.saldo
    OR NEW.custo_medio_centavos IS DISTINCT FROM OLD.custo_medio_centavos
  ) AND current_setting('manutencao.movimento', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Saldo só muda por movimento.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER manutencao_pecas_saldo_movimento
  BEFORE UPDATE ON public.manutencao_pecas
  FOR EACH ROW
  EXECUTE FUNCTION public.manutencao_pecas_impede_saldo_direto();

CREATE OR REPLACE FUNCTION public.manutencao_registrar_movimento(
  p_peca uuid,
  p_tipo text,
  p_quantidade numeric,
  p_preco integer,
  p_motivo text,
  p_usuario uuid,
  p_saldo_esperado numeric,
  p_custo_esperado integer,
  p_saldo_novo numeric,
  p_custo_novo integer
)
RETURNS TABLE (saldo numeric, custo_medio_centavos integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_peca public.manutencao_pecas%ROWTYPE;
  v_preco integer;
  v_motivo text;
BEGIN
  SELECT * INTO v_peca
  FROM public.manutencao_pecas
  WHERE id = p_peca
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça não encontrada.';
  END IF;

  IF NOT v_peca.ativo THEN
    RAISE EXCEPTION 'Peça inativa.';
  END IF;

  IF p_tipo IS DISTINCT FROM 'entrada' AND p_tipo IS DISTINCT FROM 'saida_manual' THEN
    RAISE EXCEPTION 'Movimento inválido.';
  END IF;

  IF p_quantidade IS NULL
     OR p_quantidade <= 0
     OR p_quantidade IS DISTINCT FROM trunc(p_quantidade, 3) THEN
    RAISE EXCEPTION 'Informe uma quantidade maior que zero, com até 3 casas.';
  END IF;

  IF v_peca.saldo IS DISTINCT FROM p_saldo_esperado
     OR v_peca.custo_medio_centavos IS DISTINCT FROM p_custo_esperado THEN
    RAISE EXCEPTION 'Estoque mudou. Tente de novo.';
  END IF;

  IF p_custo_novo < 0 THEN
    RAISE EXCEPTION 'Movimento inválido.';
  END IF;

  IF p_tipo = 'entrada' THEN
    IF p_preco IS NULL OR p_preco < 0 THEN
      RAISE EXCEPTION 'Informe o preço.';
    END IF;
    IF p_saldo_novo IS DISTINCT FROM (v_peca.saldo + p_quantidade) THEN
      RAISE EXCEPTION 'Movimento inválido.';
    END IF;
    IF p_custo_novo IS NULL THEN
      RAISE EXCEPTION 'Movimento inválido.';
    END IF;
    IF v_peca.saldo <= 0 OR v_peca.custo_medio_centavos IS NULL THEN
      IF p_custo_novo IS DISTINCT FROM p_preco THEN
        RAISE EXCEPTION 'Movimento inválido.';
      END IF;
    ELSIF p_custo_novo < LEAST(v_peca.custo_medio_centavos, p_preco)
       OR p_custo_novo > GREATEST(v_peca.custo_medio_centavos, p_preco) THEN
      RAISE EXCEPTION 'Movimento inválido.';
    END IF;
    v_preco := p_preco;
    v_motivo := NULL;
  ELSE
    IF p_custo_novo IS DISTINCT FROM v_peca.custo_medio_centavos THEN
      RAISE EXCEPTION 'Movimento inválido.';
    END IF;
    IF p_saldo_novo IS DISTINCT FROM (v_peca.saldo - p_quantidade) THEN
      RAISE EXCEPTION 'Movimento inválido.';
    END IF;
    v_preco := COALESCE(v_peca.custo_medio_centavos, 0);
    v_motivo := btrim(p_motivo);
  END IF;

  PERFORM set_config('manutencao.movimento', '1', true);

  UPDATE public.manutencao_pecas AS peca
  SET saldo = p_saldo_novo,
      custo_medio_centavos = p_custo_novo
  WHERE peca.id = p_peca;

  INSERT INTO public.manutencao_estoque_movimentos (
    peca_id,
    tipo,
    quantidade,
    preco_unitario_centavos,
    ordem_id,
    motivo,
    usuario_id
  ) VALUES (
    p_peca,
    p_tipo,
    p_quantidade,
    v_preco,
    NULL,
    v_motivo,
    p_usuario
  );

  RETURN QUERY SELECT p_saldo_novo, p_custo_novo;
END;
$$;

REVOKE ALL ON FUNCTION public.manutencao_registrar_movimento(
  uuid, text, numeric, integer, text, uuid, numeric, integer, numeric, integer
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.manutencao_registrar_movimento(
  uuid, text, numeric, integer, text, uuid, numeric, integer, numeric, integer
) TO service_role;
