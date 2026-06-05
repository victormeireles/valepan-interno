-- PEDIDOS_EMBALAGEM_RLS.sql
-- Aplicar após CREATE_PEDIDOS_EMBALAGEM_TABLES.sql

ALTER TABLE public.pedidos_embalagem ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pedidos_embalagem FROM anon, authenticated;
GRANT ALL ON TABLE public.pedidos_embalagem TO service_role;
