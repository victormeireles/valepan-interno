-- Executar no Supabase se já aplicou a migração principal mas recebe
-- "permission denied for table ordens_producao_diarias" (faltam GRANT no schema interno).

GRANT USAGE ON SCHEMA interno TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE interno.ordens_producao_diarias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE interno.ordens_producao_diarias_itens TO authenticated;

GRANT ALL ON TABLE interno.ordens_producao_diarias TO service_role;
GRANT ALL ON TABLE interno.ordens_producao_diarias_itens TO service_role;
