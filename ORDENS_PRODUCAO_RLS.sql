-- ORDENS_PRODUCAO_RLS.sql
-- Aplicar após MIGRATE_ORDENS_PRODUCAO_UNIFICADA.sql

ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ordens_producao FROM anon, authenticated;
GRANT ALL ON TABLE public.ordens_producao TO service_role;
