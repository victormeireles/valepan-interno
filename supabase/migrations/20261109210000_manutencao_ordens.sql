-- Consumo de ordem baixa o saldo e grava o movimento. O custo médio não muda e não é recalculado aqui.

CREATE SEQUENCE public.manutencao_ordens_numero_seq AS integer;

CREATE TABLE public.manutencao_ordens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL UNIQUE DEFAULT nextval('public.manutencao_ordens_numero_seq'),
  tipo text NOT NULL CHECK (tipo IN ('corretiva', 'preventiva')),
  plano_id uuid NULL,
  maquina_id uuid NOT NULL REFERENCES public.manutencao_maquinas(id),
  setor_id uuid NOT NULL REFERENCES public.pessoas_setores(id),
  urgencia text NULL,
  tipo_problema text NULL,
  descricao text NOT NULL CHECK (btrim(descricao) <> ''),
  status text NOT NULL CHECK (status IN ('aberta', 'recebida', 'finalizada', 'cancelada')),
  aberta_por uuid NULL REFERENCES public.usuarios(id),
  aberta_em timestamptz NOT NULL DEFAULT now(),
  recebida_por uuid NULL REFERENCES public.usuarios(id),
  recebida_em timestamptz NULL,
  inicio_em timestamptz NULL,
  fim_em timestamptz NULL,
  servicos text NULL,
  cancelada_por uuid NULL REFERENCES public.usuarios(id),
  cancelada_em timestamptz NULL,
  cancelamento_motivo text NULL,
  custo_pecas_centavos integer NOT NULL DEFAULT 0 CHECK (custo_pecas_centavos >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manutencao_ordens_tipo_campos CHECK (
    (
      tipo = 'corretiva'
      AND urgencia IN (
        'maquina_parou',
        'trabalhando_com_problema',
        'oferecendo_risco'
      )
      AND tipo_problema IN ('eletrico', 'mecanico', 'ajuste_parametro')
    )
    OR (
      tipo = 'preventiva'
      AND urgencia IS NULL
      AND tipo_problema IS NULL
    )
  ),
  CONSTRAINT manutencao_ordens_recebida CHECK (
    status <> 'recebida'
    OR (recebida_por IS NOT NULL AND recebida_em IS NOT NULL)
  ),
  CONSTRAINT manutencao_ordens_finalizada CHECK (
    status <> 'finalizada'
    OR (
      inicio_em IS NOT NULL
      AND fim_em IS NOT NULL
      AND fim_em > inicio_em
      AND btrim(servicos) <> ''
    )
  ),
  CONSTRAINT manutencao_ordens_cancelada CHECK (
    status <> 'cancelada'
    OR (cancelada_por IS NOT NULL AND cancelada_em IS NOT NULL)
  )
);

ALTER SEQUENCE public.manutencao_ordens_numero_seq
  OWNED BY public.manutencao_ordens.numero;

CREATE INDEX manutencao_ordens_status_aberta_em_idx
  ON public.manutencao_ordens (status, aberta_em);

CREATE INDEX manutencao_ordens_maquina_id_idx
  ON public.manutencao_ordens (maquina_id);

CREATE INDEX manutencao_ordens_plano_id_idx
  ON public.manutencao_ordens (plano_id);

CREATE INDEX manutencao_ordens_setor_id_idx
  ON public.manutencao_ordens (setor_id);

CREATE TABLE public.manutencao_ordem_pecas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid NOT NULL REFERENCES public.manutencao_ordens(id),
  peca_id uuid NOT NULL REFERENCES public.manutencao_pecas(id),
  quantidade numeric(14,3) NOT NULL CHECK (quantidade > 0),
  custo_unitario_centavos integer NOT NULL CHECK (custo_unitario_centavos >= 0),
  custo_total_centavos integer NOT NULL CHECK (custo_total_centavos >= 0),
  UNIQUE (ordem_id, peca_id)
);

CREATE TABLE public.manutencao_ordem_ajudantes (
  ordem_id uuid NOT NULL REFERENCES public.manutencao_ordens(id),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
  PRIMARY KEY (ordem_id, usuario_id)
);

ALTER TABLE public.manutencao_ordens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencao_ordem_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencao_ordem_ajudantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY manutencao_ordens_select ON public.manutencao_ordens
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
    OR (SELECT is_admin())
    OR (
      (SELECT auth_tem_modulo('interno_manutencao_solicitacao', 'ler'))
      AND public.manutencao_setor_vale(setor_id)
    )
  );

CREATE POLICY manutencao_ordem_pecas_select ON public.manutencao_ordem_pecas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.manutencao_ordens AS ordem
      WHERE ordem.id = manutencao_ordem_pecas.ordem_id
        AND (
          (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
          OR (SELECT is_admin())
          OR (
            (SELECT auth_tem_modulo('interno_manutencao_solicitacao', 'ler'))
            AND public.manutencao_setor_vale(ordem.setor_id)
          )
        )
    )
  );

CREATE POLICY manutencao_ordem_ajudantes_select ON public.manutencao_ordem_ajudantes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.manutencao_ordens AS ordem
      WHERE ordem.id = manutencao_ordem_ajudantes.ordem_id
        AND (
          (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
          OR (SELECT is_admin())
          OR (
            (SELECT auth_tem_modulo('interno_manutencao_solicitacao', 'ler'))
            AND public.manutencao_setor_vale(ordem.setor_id)
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.manutencao_substituir_usuario_setores(
  p_usuario uuid,
  p_setores uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.manutencao_usuario_setores
  WHERE usuario_id = p_usuario;

  INSERT INTO public.manutencao_usuario_setores (usuario_id, setor_id)
  SELECT p_usuario, setor_id
  FROM unnest(COALESCE(p_setores, ARRAY[]::uuid[])) AS setor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.manutencao_substituir_usuario_setores(uuid, uuid[])
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.manutencao_substituir_usuario_setores(uuid, uuid[])
  TO service_role;

CREATE OR REPLACE FUNCTION public.manutencao_finalizar_ordem(
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

  IF NOT FOUND OR v_ordem.status IS DISTINCT FROM 'recebida' THEN
    RAISE EXCEPTION 'Ordem não está recebida.';
  END IF;

  IF p_administra IS NOT TRUE
     AND v_ordem.recebida_por IS DISTINCT FROM p_usuario THEN
    RAISE EXCEPTION 'Só quem recebeu ou quem administra finaliza.';
  END IF;

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

    IF NOT v_peca.ativo THEN
      RAISE EXCEPTION 'Peça inativa.';
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
  SET status = 'finalizada',
      inicio_em = p_inicio,
      fim_em = p_fim,
      servicos = btrim(p_servicos),
      custo_pecas_centavos = p_custo_pecas,
      updated_at = now()
  WHERE id = p_ordem;

  RETURN v_faltando;
END;
$$;

REVOKE ALL ON FUNCTION public.manutencao_finalizar_ordem(
  uuid, uuid, timestamptz, timestamptz, text, integer, jsonb, uuid[], boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.manutencao_finalizar_ordem(
  uuid, uuid, timestamptz, timestamptz, text, integer, jsonb, uuid[], boolean
) TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.manutencao_ordens_numero_seq TO service_role;
