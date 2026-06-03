-- ESTOQUE_RLS.sql
-- Habilita RLS nas tabelas de estoque/inventário (Fase A).
-- Aplicar no SQL Editor do Supabase (projeto valepan-pedidos).
--
-- Sem políticas para anon/authenticated: apenas service role (API Next.js) acessa.
-- Isso remove o status "UNRESTRICTED" no dashboard e bloqueia acesso direto via chave anon.

ALTER TABLE public.estoque_saldos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_lancamento_itens ENABLE ROW LEVEL SECURITY;

-- Revoga acesso direto herdado do schema public (defesa em profundidade)
REVOKE ALL ON TABLE public.estoque_saldos FROM anon, authenticated;
REVOKE ALL ON TABLE public.estoque_movimentos FROM anon, authenticated;
REVOKE ALL ON TABLE public.inventario_lancamentos FROM anon, authenticated;
REVOKE ALL ON TABLE public.inventario_lancamento_itens FROM anon, authenticated;

GRANT ALL ON TABLE public.estoque_saldos TO service_role;
GRANT ALL ON TABLE public.estoque_movimentos TO service_role;
GRANT ALL ON TABLE public.inventario_lancamentos TO service_role;
GRANT ALL ON TABLE public.inventario_lancamento_itens TO service_role;
