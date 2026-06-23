-- BACKFILL_ORDENS_PRODUCAO_ETAPA_FINALIZADA_3D.sql
-- Marca como finalizadas (últimos 3 dias) as OPs com produzido >= 90% da meta efetiva,
-- usando o total realizado nos lotes e a data do último lote como finalizada_em.
--
-- Meta efetiva por etapa (espelha o app):
--   Fermentação: assadeiras da OP (ou unidades se sem assadeira)
--   Forno: COALESCE(fermentacao_meta_confirmada, assadeiras OP) — cascata
--   Embalagem: caixas > pacotes > unidades > kg (derivarUnidadePrincipal)
--
-- Só atualiza ordens com data_producao nos últimos 3 dias e que ainda NÃO estão
-- finalizadas na etapa. Cada bloco UPDATE é independente e re-executável.
--
-- 1) Rode DIAGNOSTICO para ver elegíveis vs bloqueados
-- 2) Rode PREVIEW e confira
-- 3) Rode os UPDATEs (pode rodar só o bloco da etapa desejada)

-- ---------------------------------------------------------------------------
-- DIAGNOSTICO — forno com produção mas abaixo de 90% da meta OP
-- (útil quando cascata muda o critério)
-- ---------------------------------------------------------------------------

WITH ordens_janela AS (
  SELECT *
  FROM ordens_producao
  WHERE data_producao >= (CURRENT_DATE - INTERVAL '3 days')
),
forno_diag AS (
  SELECT
    o.id,
    o.data_producao,
    o.assadeiras AS meta_op_lt,
    COALESCE(o.fermentacao_meta_confirmada, o.assadeiras) AS meta_efetiva_lt,
    COALESCE(SUM(fl.assadeiras), 0) AS produzido_lt,
    o.forno_finalizada,
    ROUND(
      100.0 * COALESCE(SUM(fl.assadeiras), 0)
        / NULLIF(COALESCE(o.fermentacao_meta_confirmada, o.assadeiras), 0),
      1
    ) AS pct_meta_efetiva,
    ROUND(100.0 * COALESCE(SUM(fl.assadeiras), 0) / NULLIF(o.assadeiras, 0), 1) AS pct_meta_op
  FROM ordens_janela o
  INNER JOIN forno_lotes fl ON fl.ordem_producao_id = o.id
  WHERE o.assadeira_id IS NOT NULL
  GROUP BY o.id, o.data_producao, o.assadeiras, o.fermentacao_meta_confirmada, o.forno_finalizada
)
SELECT *
FROM forno_diag
WHERE produzido_lt > 0
  AND NOT forno_finalizada
ORDER BY data_producao DESC, pct_meta_efetiva DESC;


-- ---------------------------------------------------------------------------
-- PREVIEW — conferir antes de aplicar
-- ---------------------------------------------------------------------------

WITH ordens_janela AS (
  SELECT *
  FROM ordens_producao
  WHERE data_producao >= (CURRENT_DATE - INTERVAL '3 days')
),

ferm_base AS (
  SELECT
    o.id AS ordem_id,
    o.data_producao,
    o.assadeiras AS meta_lt,
    o.unidades AS meta_un,
    o.assadeira_id IS NOT NULL AS usa_assadeira,
    COALESCE(SUM(fl.assadeiras), 0) AS produzido_lt,
    COALESCE(SUM(fl.unidades), 0) AS produzido_un,
    MAX(fl.produzido_em) AS ultimo_lote_em
  FROM ordens_janela o
  INNER JOIN fermentacao_lotes fl ON fl.ordem_producao_id = o.id
  WHERE NOT o.fermentacao_finalizada
  GROUP BY o.id, o.data_producao, o.assadeiras, o.unidades, o.assadeira_id
),
ferm_elegivel AS (
  SELECT
    ordem_id,
    data_producao,
    'fermentacao'::text AS etapa,
    CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END AS produzido,
    CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END AS meta,
    CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END AS meta_confirmada,
    ultimo_lote_em
  FROM ferm_base
  WHERE (CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END) > 0
    AND (CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END)
        >= (CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END) * 0.9
),

forno_base AS (
  SELECT
    o.id AS ordem_id,
    o.data_producao,
    o.assadeiras AS meta_op_lt,
    o.unidades AS meta_op_un,
    COALESCE(o.fermentacao_meta_confirmada, o.assadeiras) AS meta_lt,
    o.unidades AS meta_un,
    o.assadeira_id IS NOT NULL AS usa_assadeira,
    COALESCE(SUM(fl.assadeiras), 0) AS produzido_lt,
    COALESCE(SUM(fl.unidades), 0) AS produzido_un,
    MAX(fl.produzido_em) AS ultimo_lote_em
  FROM ordens_janela o
  INNER JOIN forno_lotes fl ON fl.ordem_producao_id = o.id
  WHERE NOT o.forno_finalizada
  GROUP BY
    o.id,
    o.data_producao,
    o.assadeiras,
    o.unidades,
    o.assadeira_id,
    o.fermentacao_meta_confirmada
),
forno_elegivel AS (
  SELECT
    ordem_id,
    data_producao,
    'forno'::text AS etapa,
    CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END AS produzido,
    CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END AS meta,
    CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END AS meta_confirmada,
    ultimo_lote_em
  FROM forno_base
  WHERE (CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END) > 0
    AND (CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END)
        >= (CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END) * 0.9
),

emb_base AS (
  SELECT
    o.id AS ordem_id,
    o.data_producao,
    o.caixas,
    o.pacotes,
    o.unidades AS meta_un,
    o.kg AS meta_kg,
    COALESCE(SUM(el.caixas), 0) AS produzido_cx,
    COALESCE(SUM(el.pacotes), 0) AS produzido_pct,
    COALESCE(SUM(el.unidades), 0) AS produzido_un,
    COALESCE(SUM(el.kg), 0) AS produzido_kg,
    MAX(el.produzido_em) AS ultimo_lote_em
  FROM ordens_janela o
  INNER JOIN embalagem_lotes el ON el.ordem_producao_id = o.id
  WHERE NOT o.embalagem_finalizada
  GROUP BY o.id, o.data_producao, o.caixas, o.pacotes, o.unidades, o.kg
),
emb_elegivel AS (
  SELECT
    ordem_id,
    data_producao,
    'embalagem'::text AS etapa,
    CASE
      WHEN caixas > 0 THEN produzido_cx
      WHEN pacotes > 0 THEN produzido_pct
      WHEN meta_un > 0 THEN produzido_un
      ELSE produzido_kg
    END AS produzido,
    CASE
      WHEN caixas > 0 THEN caixas
      WHEN pacotes > 0 THEN pacotes
      WHEN meta_un > 0 THEN meta_un
      ELSE meta_kg
    END AS meta,
    CASE
      WHEN caixas > 0 THEN produzido_cx
      WHEN pacotes > 0 THEN produzido_pct
      WHEN meta_un > 0 THEN produzido_un
      ELSE produzido_kg
    END AS meta_confirmada,
    ultimo_lote_em
  FROM emb_base
  WHERE (
    CASE
      WHEN caixas > 0 THEN caixas
      WHEN pacotes > 0 THEN pacotes
      WHEN meta_un > 0 THEN meta_un
      ELSE meta_kg
    END
  ) > 0
  AND (
    CASE
      WHEN caixas > 0 THEN produzido_cx
      WHEN pacotes > 0 THEN produzido_pct
      WHEN meta_un > 0 THEN produzido_un
      ELSE produzido_kg
    END
  ) >= (
    CASE
      WHEN caixas > 0 THEN caixas
      WHEN pacotes > 0 THEN pacotes
      WHEN meta_un > 0 THEN meta_un
      ELSE meta_kg
    END
  ) * 0.9
)

SELECT
  etapa,
  ordem_id,
  data_producao,
  produzido,
  meta,
  ROUND(100.0 * produzido / NULLIF(meta, 0), 1) AS pct_meta,
  meta_confirmada,
  ultimo_lote_em AS finalizada_em
FROM (
  SELECT * FROM ferm_elegivel
  UNION ALL
  SELECT * FROM forno_elegivel
  UNION ALL
  SELECT * FROM emb_elegivel
) t
ORDER BY data_producao DESC, etapa, ordem_id;


-- ---------------------------------------------------------------------------
-- UPDATE FERMENTAÇÃO (re-executável)
-- ---------------------------------------------------------------------------

BEGIN;

WITH ordens_janela AS (
  SELECT *
  FROM ordens_producao
  WHERE data_producao >= (CURRENT_DATE - INTERVAL '3 days')
),
ferm_base AS (
  SELECT
    o.id AS ordem_id,
    o.assadeira_id IS NOT NULL AS usa_assadeira,
    COALESCE(SUM(fl.assadeiras), 0) AS produzido_lt,
    COALESCE(SUM(fl.unidades), 0) AS produzido_un,
    o.assadeiras AS meta_lt,
    o.unidades AS meta_un,
    MAX(fl.produzido_em) AS ultimo_lote_em
  FROM ordens_janela o
  INNER JOIN fermentacao_lotes fl ON fl.ordem_producao_id = o.id
  WHERE NOT o.fermentacao_finalizada
  GROUP BY o.id, o.assadeira_id, o.assadeiras, o.unidades
),
ferm_elegivel AS (
  SELECT
    ordem_id,
    CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END AS meta_confirmada,
    ultimo_lote_em
  FROM ferm_base
  WHERE (CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END) > 0
    AND (CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END)
        >= (CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END) * 0.9
),
upd_ferm AS (
  UPDATE ordens_producao op
  SET
    fermentacao_finalizada = true,
    fermentacao_meta_confirmada = fe.meta_confirmada,
    fermentacao_finalizada_em = fe.ultimo_lote_em,
    updated_at = now()
  FROM ferm_elegivel fe
  WHERE op.id = fe.ordem_id
  RETURNING op.id
)
SELECT COUNT(*) AS fermentacao_atualizadas FROM upd_ferm;

COMMIT;


-- ---------------------------------------------------------------------------
-- UPDATE FORNO (re-executável) — meta cascata da fermentação
-- ---------------------------------------------------------------------------

BEGIN;

WITH ordens_janela AS (
  SELECT *
  FROM ordens_producao
  WHERE data_producao >= (CURRENT_DATE - INTERVAL '3 days')
),
forno_base AS (
  SELECT
    o.id AS ordem_id,
    o.assadeira_id IS NOT NULL AS usa_assadeira,
    COALESCE(SUM(fl.assadeiras), 0) AS produzido_lt,
    COALESCE(SUM(fl.unidades), 0) AS produzido_un,
    COALESCE(o.fermentacao_meta_confirmada, o.assadeiras) AS meta_lt,
    o.unidades AS meta_un,
    MAX(fl.produzido_em) AS ultimo_lote_em
  FROM ordens_janela o
  INNER JOIN forno_lotes fl ON fl.ordem_producao_id = o.id
  WHERE NOT o.forno_finalizada
  GROUP BY
    o.id,
    o.assadeira_id,
    o.assadeiras,
    o.unidades,
    o.fermentacao_meta_confirmada
),
forno_elegivel AS (
  SELECT
    ordem_id,
    CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END AS meta_confirmada,
    ultimo_lote_em
  FROM forno_base
  WHERE (CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END) > 0
    AND (CASE WHEN usa_assadeira THEN produzido_lt ELSE produzido_un END)
        >= (CASE WHEN usa_assadeira THEN meta_lt ELSE meta_un END) * 0.9
),
upd_forno AS (
  UPDATE ordens_producao op
  SET
    forno_finalizada = true,
    forno_meta_confirmada = fe.meta_confirmada,
    forno_finalizada_em = fe.ultimo_lote_em,
    updated_at = now()
  FROM forno_elegivel fe
  WHERE op.id = fe.ordem_id
  RETURNING op.id
)
SELECT COUNT(*) AS forno_atualizadas FROM upd_forno;

COMMIT;


-- ---------------------------------------------------------------------------
-- UPDATE EMBALAGEM (re-executável) — só quando já embalou >= 90%
-- ---------------------------------------------------------------------------

BEGIN;

WITH ordens_janela AS (
  SELECT *
  FROM ordens_producao
  WHERE data_producao >= (CURRENT_DATE - INTERVAL '3 days')
),
emb_base AS (
  SELECT
    o.id AS ordem_id,
    o.caixas,
    o.pacotes,
    o.unidades AS meta_un,
    o.kg AS meta_kg,
    COALESCE(SUM(el.caixas), 0) AS produzido_cx,
    COALESCE(SUM(el.pacotes), 0) AS produzido_pct,
    COALESCE(SUM(el.unidades), 0) AS produzido_un,
    COALESCE(SUM(el.kg), 0) AS produzido_kg,
    MAX(el.produzido_em) AS ultimo_lote_em
  FROM ordens_janela o
  INNER JOIN embalagem_lotes el ON el.ordem_producao_id = o.id
  WHERE NOT o.embalagem_finalizada
  GROUP BY o.id, o.caixas, o.pacotes, o.unidades, o.kg
),
emb_elegivel AS (
  SELECT
    ordem_id,
    CASE
      WHEN caixas > 0 THEN produzido_cx
      WHEN pacotes > 0 THEN produzido_pct
      WHEN meta_un > 0 THEN produzido_un
      ELSE produzido_kg
    END AS meta_confirmada,
    ultimo_lote_em
  FROM emb_base
  WHERE (
    CASE
      WHEN caixas > 0 THEN caixas
      WHEN pacotes > 0 THEN pacotes
      WHEN meta_un > 0 THEN meta_un
      ELSE meta_kg
    END
  ) > 0
  AND (
    CASE
      WHEN caixas > 0 THEN produzido_cx
      WHEN pacotes > 0 THEN produzido_pct
      WHEN meta_un > 0 THEN produzido_un
      ELSE produzido_kg
    END
  ) >= (
    CASE
      WHEN caixas > 0 THEN caixas
      WHEN pacotes > 0 THEN pacotes
      WHEN meta_un > 0 THEN meta_un
      ELSE meta_kg
    END
  ) * 0.9
),
upd_emb AS (
  UPDATE ordens_producao op
  SET
    embalagem_finalizada = true,
    embalagem_meta_confirmada = ROUND(ee.meta_confirmada)::integer,
    embalagem_finalizada_em = ee.ultimo_lote_em,
    updated_at = now()
  FROM emb_elegivel ee
  WHERE op.id = ee.ordem_id
  RETURNING op.id
)
SELECT COUNT(*) AS embalagem_atualizadas FROM upd_emb;

COMMIT;
