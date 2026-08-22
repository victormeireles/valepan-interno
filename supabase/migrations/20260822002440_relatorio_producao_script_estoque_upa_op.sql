-- pedido_embalagem convertia LT→CX só via produto_assadeiras.
-- Sem esse vínculo, a view caía no ELSE caixas e ignorava fermentação/forno
-- já confirmados (ex.: Australiano 65g). Usa a assadeira da própria OP.

CREATE OR REPLACE VIEW public.relatorio_producao_script_estoque_v AS
WITH hoje AS (
  SELECT timezone('America/Sao_Paulo'::text, now())::date AS d
),
estoque_agg AS (
  SELECT
    estoque_saldos.produto_id,
    estoque_saldos.tipo_estoque_id,
    sum(estoque_saldos.caixas)::numeric AS estoque
  FROM estoque_saldos
  GROUP BY estoque_saldos.produto_id, estoque_saldos.tipo_estoque_id
),
rlz_agg AS (
  SELECT
    el.produto_id,
    el.tipo_estoque_id,
    sum(el.caixas)::numeric AS rlz_embalagem
  FROM embalagem_lotes el
  CROSS JOIN hoje
  WHERE el.data_pedido = hoje.d
  GROUP BY el.produto_id, el.tipo_estoque_id
),
op_com_ctx AS (
  SELECT
    op.id,
    op.produto_id,
    op.tipo_estoque_id,
    op.caixas,
    op.embalagem_finalizada,
    op.embalagem_meta_confirmada,
    op.forno_meta_confirmada,
    op.fermentacao_meta_confirmada,
    pr_1.box_units,
    COALESCE(
      NULLIF(pa_op.unidades_por_assadeira, 0),
      NULLIF(a_op.unidades_por_assadeira, 0),
      NULLIF(pa_def.unidades_por_assadeira, 0),
      NULLIF(a_def.unidades_por_assadeira, 0)
    ) AS unidades_por_assadeira_efetiva
  FROM ordens_producao op
  CROSS JOIN hoje
  JOIN produtos pr_1 ON pr_1.id = op.produto_id
  LEFT JOIN produto_assadeiras pa_op
    ON pa_op.produto_id = op.produto_id
    AND pa_op.assadeira_id = op.assadeira_id
  LEFT JOIN assadeiras a_op ON a_op.id = op.assadeira_id
  LEFT JOIN LATERAL (
    SELECT
      pa.assadeira_id,
      pa.unidades_por_assadeira
    FROM produto_assadeiras pa
    WHERE pa.produto_id = op.produto_id
    ORDER BY pa.ordem, pa.created_at
    LIMIT 1
  ) pa_def ON true
  LEFT JOIN assadeiras a_def ON a_def.id = pa_def.assadeira_id
  WHERE op.data_producao = hoje.d
),
op_meta AS (
  SELECT
    op_com_ctx.produto_id,
    op_com_ctx.tipo_estoque_id,
    op_com_ctx.caixas::numeric AS pedido_op_cx,
    CASE
      WHEN op_com_ctx.embalagem_finalizada THEN
        COALESCE(op_com_ctx.embalagem_meta_confirmada, 0)::numeric
      WHEN op_com_ctx.forno_meta_confirmada IS NOT NULL
        AND op_com_ctx.box_units IS NOT NULL
        AND op_com_ctx.box_units > 0
        AND op_com_ctx.unidades_por_assadeira_efetiva IS NOT NULL
        AND op_com_ctx.unidades_por_assadeira_efetiva > 0 THEN
        floor(
          round(
            op_com_ctx.forno_meta_confirmada
            * op_com_ctx.unidades_por_assadeira_efetiva::numeric
          ) / op_com_ctx.box_units::numeric
        )
      WHEN op_com_ctx.fermentacao_meta_confirmada IS NOT NULL
        AND op_com_ctx.box_units IS NOT NULL
        AND op_com_ctx.box_units > 0
        AND op_com_ctx.unidades_por_assadeira_efetiva IS NOT NULL
        AND op_com_ctx.unidades_por_assadeira_efetiva > 0 THEN
        floor(
          round(
            op_com_ctx.fermentacao_meta_confirmada
            * op_com_ctx.unidades_por_assadeira_efetiva::numeric
          ) / op_com_ctx.box_units::numeric
        )
      ELSE op_com_ctx.caixas::numeric
    END AS meta_efetiva_cx
  FROM op_com_ctx
),
pedido_agg AS (
  SELECT
    op_meta.produto_id,
    op_meta.tipo_estoque_id,
    sum(op_meta.pedido_op_cx) AS pedido_embalagem_op,
    sum(op_meta.meta_efetiva_cx) AS pedido_embalagem
  FROM op_meta
  GROUP BY op_meta.produto_id, op_meta.tipo_estoque_id
),
chaves AS (
  SELECT estoque_agg.produto_id, estoque_agg.tipo_estoque_id FROM estoque_agg
  UNION
  SELECT rlz_agg.produto_id, rlz_agg.tipo_estoque_id FROM rlz_agg
  UNION
  SELECT pedido_agg.produto_id, pedido_agg.tipo_estoque_id FROM pedido_agg
)
SELECT
  te.nome AS tipo_de_estoque,
  pr.nome AS nome_produto,
  COALESCE(e.estoque, 0::numeric) AS estoque,
  COALESCE(r.rlz_embalagem, 0::numeric) AS rlz_embalagem,
  COALESCE(p.pedido_embalagem, 0::numeric) AS pedido_embalagem,
  COALESCE(p.pedido_embalagem_op, 0::numeric) AS pedido_embalagem_op,
  GREATEST(
    COALESCE(p.pedido_embalagem, 0::numeric) - COALESCE(r.rlz_embalagem, 0::numeric),
    0::numeric
  ) AS saldo_embalagem
FROM chaves c
JOIN produtos pr ON pr.id = c.produto_id
JOIN tipos_estoque te ON te.id = c.tipo_estoque_id
LEFT JOIN estoque_agg e
  ON e.produto_id = c.produto_id AND e.tipo_estoque_id = c.tipo_estoque_id
LEFT JOIN rlz_agg r
  ON r.produto_id = c.produto_id AND r.tipo_estoque_id = c.tipo_estoque_id
LEFT JOIN pedido_agg p
  ON p.produto_id = c.produto_id AND p.tipo_estoque_id = c.tipo_estoque_id
WHERE COALESCE(e.estoque, 0::numeric) > 0::numeric
   OR COALESCE(r.rlz_embalagem, 0::numeric) > 0::numeric
   OR COALESCE(p.pedido_embalagem, 0::numeric) > 0::numeric
   OR COALESCE(p.pedido_embalagem_op, 0::numeric) > 0::numeric;
