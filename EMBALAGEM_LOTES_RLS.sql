-- EMBALAGEM_LOTES_RLS.sql
-- Aplicar após CREATE_EMBALAGEM_LOTES_TABLES.sql

ALTER TABLE public.embalagem_lotes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.embalagem_lotes FROM anon, authenticated;
GRANT ALL ON TABLE public.embalagem_lotes TO service_role;
