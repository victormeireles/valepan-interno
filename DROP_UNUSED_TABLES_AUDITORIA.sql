-- =============================================================================
-- DROP: 8 tabelas public sem uso em Valepan Interno nem valepan-pedidos
-- =============================================================================
-- Fonte: docs/auditoria-tabelas-remocao-consolidada.md (2026-06-18)
--
-- Tabelas removidas:
--   producao_massa_ingredientes, producao_etapas_log, receita_masseira_parametros,
--   masseiras, carrinhos, caminhoes, cliente_assadeira_bloqueios, cliente_assadeiras
--
-- Aplicar no SQL Editor do Supabase (projeto valepan-pedidos).
-- Após aplicar: npm run gen:types (Interno + valepan-pedidos) e sincronizar types.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Pré-voo (opcional — conferir contagens antes de dropar)
-- -----------------------------------------------------------------------------
-- SELECT 'producao_massa_ingredientes' AS t, COUNT(*) FROM public.producao_massa_ingredientes
-- UNION ALL SELECT 'producao_etapas_log', COUNT(*) FROM public.producao_etapas_log
-- UNION ALL SELECT 'receita_masseira_parametros', COUNT(*) FROM public.receita_masseira_parametros
-- UNION ALL SELECT 'masseiras', COUNT(*) FROM public.masseiras
-- UNION ALL SELECT 'carrinhos', COUNT(*) FROM public.carrinhos
-- UNION ALL SELECT 'caminhoes', COUNT(*) FROM public.caminhoes
-- UNION ALL SELECT 'cliente_assadeira_bloqueios', COUNT(*) FROM public.cliente_assadeira_bloqueios
-- UNION ALL SELECT 'cliente_assadeiras', COUNT(*) FROM public.cliente_assadeiras;

-- -----------------------------------------------------------------------------
-- 1. Views que dependem de producao_etapas_log
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.vw_dashboard_producao;

-- -----------------------------------------------------------------------------
-- 2. Tabelas dependentes (filhas)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.producao_massa_ingredientes;
DROP TABLE IF EXISTS public.receita_masseira_parametros;
DROP TABLE IF EXISTS public.cliente_assadeira_bloqueios;
DROP TABLE IF EXISTS public.cliente_assadeiras;

-- -----------------------------------------------------------------------------
-- 3. Tabelas pai / independentes
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.producao_etapas_log;
DROP TABLE IF EXISTS public.masseiras;
DROP TABLE IF EXISTS public.carrinhos;
DROP TABLE IF EXISTS public.caminhoes;

-- -----------------------------------------------------------------------------
-- 4. Pós-voo (opcional — confirmar remoção)
-- -----------------------------------------------------------------------------
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'producao_massa_ingredientes', 'producao_etapas_log', 'receita_masseira_parametros',
--     'masseiras', 'carrinhos', 'caminhoes', 'cliente_assadeira_bloqueios', 'cliente_assadeiras'
--   );
