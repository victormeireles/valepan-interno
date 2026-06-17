-- FORNO_LOTES_RLS.sql
-- Aplicar após CREATE_FERMENTACAO_FORNO_LOTES_TABLES.sql

ALTER TABLE public.forno_lotes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.forno_lotes FROM anon, authenticated;
GRANT ALL ON TABLE public.forno_lotes TO service_role;
