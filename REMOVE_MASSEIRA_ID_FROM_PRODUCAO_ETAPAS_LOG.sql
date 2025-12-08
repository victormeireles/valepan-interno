-- Remove a coluna masseira_id da tabela producao_etapas_log
-- A coluna não é mais necessária pois cada lote de massa já possui sua própria masseira_id
-- na tabela producao_massa_lotes

-- Primeiro, remove a foreign key constraint
ALTER TABLE producao_etapas_log
DROP CONSTRAINT IF EXISTS producao_etapas_log_masseira_id_fkey;

-- Depois, remove a coluna
ALTER TABLE producao_etapas_log
DROP COLUMN IF EXISTS masseira_id;

-- Atualiza a view vw_dashboard_producao removendo a coluna masseira_atual
-- que dependia da coluna masseira_id que foi removida
DROP VIEW IF EXISTS public.vw_dashboard_producao;

CREATE VIEW public.vw_dashboard_producao AS
SELECT
  op.id,
  op.lote_codigo,
  op.status,
  op.prioridade,
  op.qtd_planejada,
  op.data_producao,
  op.created_at AS op_created_at,
  p.id AS produto_id,
  p.nome AS produto_nome,
  p.codigo AS produto_codigo,
  u.nome_resumido AS produto_unidade,
  p.unidades_assadeira,
  p.box_units,
  ped.id AS pedido_id,
  (
    SELECT
      log.etapa
    FROM
      producao_etapas_log log
    WHERE
      log.ordem_producao_id = op.id
    ORDER BY
      log.inicio DESC
    LIMIT
      1
  ) AS etapa_atual,
  (
    SELECT
      u.nome
    FROM
      producao_etapas_log log
      JOIN usuarios u ON u.id = log.usuario_id
    WHERE
      log.ordem_producao_id = op.id
    ORDER BY
      log.inicio DESC
    LIMIT
      1
  ) AS usuario_atual,
  (
    SELECT
      MAX(log.inicio) AS max
    FROM
      producao_etapas_log log
    WHERE
      log.ordem_producao_id = op.id
  ) AS ultima_atividade_at,
  (
    SELECT
      log.qtd_saida
    FROM
      producao_etapas_log log
    WHERE
      log.ordem_producao_id = op.id
      AND log.fim IS NOT NULL
    ORDER BY
      (
        CASE log.etapa
          WHEN 'massa'::text THEN 1
          WHEN 'fermentacao'::text THEN 2
          WHEN 'forno'::text THEN 3
          WHEN 'embalagem'::text THEN 4
          ELSE NULL::integer
        END
      ) DESC
    LIMIT
      1
  ) AS qtd_produzida_atual
FROM
  ordens_producao op
  JOIN produtos p ON op.produto_id = p.id
  LEFT JOIN unidades u ON p.unidade_padrao_id = u.id
  LEFT JOIN pedidos ped ON op.pedido_id = ped.id
WHERE
  op.status::text <> 'cancelado'::text;

