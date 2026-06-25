-- FERMENTACAO_LOTES_RLS.sql
-- Aplicar após CREATE_FERMENTACAO_FORNO_LOTES_TABLES.sql

ALTER TABLE public.fermentacao_lotes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.fermentacao_lotes FROM anon, authenticated;
GRANT ALL ON TABLE public.fermentacao_lotes TO service_role;
