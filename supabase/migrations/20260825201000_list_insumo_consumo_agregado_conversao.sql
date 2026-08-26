-- Inclui conversão visual opcional no agregado de consumo de insumos.

DROP FUNCTION IF EXISTS public.list_insumo_consumo_agregado(timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION public.list_insumo_consumo_agregado(
  p_start timestamptz,
  p_end timestamptz,
  p_visualizacao text DEFAULT 'semanal'
)
RETURNS TABLE (
  insumo_id uuid,
  nome text,
  unidade_resumida text,
  conversao_fator numeric,
  conversao_unidade_resumida text,
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
      i.conversao_fator,
      COALESCE(uc.nome_resumido, '') AS conversao_unidade_resumida,
      (m.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS data_sp,
      m.delta_quantidade AS delta
    FROM public.insumo_movimentos m
    INNER JOIN public.insumos i ON i.id = m.insumo_id
    LEFT JOIN public.unidades u ON u.id = i.unidade_id
    LEFT JOIN public.unidades uc ON uc.id = i.conversao_unidade_id
    WHERE m.origem IN (
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
    movimentos.conversao_fator,
    movimentos.conversao_unidade_resumida,
    CASE
      WHEN p_visualizacao = 'diaria' THEN movimentos.data_sp
      ELSE (movimentos.data_sp - EXTRACT(DOW FROM movimentos.data_sp)::integer)
    END AS coluna_inicio,
    GREATEST(0, -SUM(movimentos.delta)) AS consumo
  FROM movimentos
  GROUP BY
    movimentos.insumo_id,
    movimentos.nome,
    movimentos.unidade_resumida,
    movimentos.conversao_fator,
    movimentos.conversao_unidade_resumida,
    CASE
      WHEN p_visualizacao = 'diaria' THEN movimentos.data_sp
      ELSE (movimentos.data_sp - EXTRACT(DOW FROM movimentos.data_sp)::integer)
    END
  HAVING GREATEST(0, -SUM(movimentos.delta)) > 0
  ORDER BY movimentos.nome, coluna_inicio;
$$;

REVOKE ALL ON FUNCTION public.list_insumo_consumo_agregado(timestamptz, timestamptz, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_insumo_consumo_agregado(timestamptz, timestamptz, text)
  TO authenticated, service_role;
