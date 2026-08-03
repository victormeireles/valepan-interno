-- Consumo semanal/diário agregado no banco (evita paginar dezenas de milhares de movimentos).
-- Também cria índice parcial para o filtro de saídas de produção.

CREATE INDEX IF NOT EXISTS idx_insumo_mov_consumo_producao
  ON public.insumo_movimentos (origem, created_at)
  WHERE delta_quantidade < 0
    AND origem IN (
      'producao_fermentacao'::public.insumo_movimento_origem,
      'producao_forno'::public.insumo_movimento_origem,
      'producao_embalagem'::public.insumo_movimento_origem
    );

CREATE OR REPLACE FUNCTION public.list_insumo_consumo_agregado(
  p_start timestamptz,
  p_end timestamptz,
  p_visualizacao text DEFAULT 'semanal'
)
RETURNS TABLE (
  insumo_id uuid,
  nome text,
  unidade_resumida text,
  coluna_inicio date,
  consumo numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH movimentos AS (
    SELECT
      m.insumo_id,
      i.nome,
      COALESCE(u.nome_resumido, '') AS unidade_resumida,
      (m.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS data_sp,
      ABS(m.delta_quantidade) AS consumo
    FROM public.insumo_movimentos m
    INNER JOIN public.insumos i ON i.id = m.insumo_id
    LEFT JOIN public.unidades u ON u.id = i.unidade_id
    WHERE m.delta_quantidade < 0
      AND m.origem IN (
        'producao_fermentacao'::public.insumo_movimento_origem,
        'producao_forno'::public.insumo_movimento_origem,
        'producao_embalagem'::public.insumo_movimento_origem
      )
      AND m.created_at >= p_start
      AND m.created_at < p_end
      AND (
        (m.origem = 'producao_fermentacao' AND m.fermentacao_lote_id IS NOT NULL)
        OR (m.origem = 'producao_forno' AND m.forno_lote_id IS NOT NULL)
        OR (m.origem = 'producao_embalagem' AND m.embalagem_lote_id IS NOT NULL)
      )
  )
  SELECT
    movimentos.insumo_id,
    movimentos.nome,
    movimentos.unidade_resumida,
    CASE
      WHEN p_visualizacao = 'diaria' THEN movimentos.data_sp
      ELSE (movimentos.data_sp - EXTRACT(DOW FROM movimentos.data_sp)::integer)
    END AS coluna_inicio,
    SUM(movimentos.consumo) AS consumo
  FROM movimentos
  GROUP BY
    movimentos.insumo_id,
    movimentos.nome,
    movimentos.unidade_resumida,
    CASE
      WHEN p_visualizacao = 'diaria' THEN movimentos.data_sp
      ELSE (movimentos.data_sp - EXTRACT(DOW FROM movimentos.data_sp)::integer)
    END
  ORDER BY movimentos.nome, coluna_inicio;
$$;

REVOKE ALL ON FUNCTION public.list_insumo_consumo_agregado(timestamptz, timestamptz, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_insumo_consumo_agregado(timestamptz, timestamptz, text)
  TO authenticated, service_role;
