-- Migration one-shot: clone domínio do app de public -> interno (estrutura, dados, FKs internos, RLS, grants).
--
-- Inventário (base + fechamento de FK obrigatório):
--   assadeiras, carrinhos, categorias, cliente_assadeira_bloqueios, clientes, empresas, enderecos_entrega,
--   insumos, masseiras, ordens_producao, parcelas, pedidos, produto_assadeiras, produto_receitas, produtos,
--   producao_etapas_log, producao_massa_ingredientes, receita_ingredientes, receitas, tipos_estoque,
--   unidades, usuarios
--
-- Pré-requisitos operacionais:
--   - Janela de manutenção (sem escritas concorrentes).
--   - backup/snapshot do projeto.
--   - Após aplicar: expor o schema "interno" na API do Supabase (Project Settings > API > Exposed schemas)
--     para PostgREST aceitar db.schema=interno no client.
--
-- Reexecução: falha se já existirem tabelas em interno (evita duplicar dados).

BEGIN;

CREATE SCHEMA IF NOT EXISTS interno;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'interno'
      AND table_name IN (
        'assadeiras','carrinhos','categorias','cliente_assadeira_bloqueios','clientes','empresas',
        'enderecos_entrega','insumos','masseiras','ordens_producao','parcelas','pedidos',
        'produto_assadeiras','produto_receitas','produtos','producao_etapas_log',
        'producao_massa_ingredientes','receita_ingredientes','receitas','tipos_estoque','unidades','usuarios'
      )
  ) THEN
    RAISE EXCEPTION 'interno já contém tabelas migradas; abortando para evitar duplicação. Drop manual do schema interno se for reprocessar.';
  END IF;
END $$;

-- 1) Estrutura (inclui PK, unique, indexes, defaults; FKs apontarão para public até o passo 3)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'empresas','parcelas','tipos_estoque','categorias','unidades','masseiras','receitas','insumos',
    'clientes','produtos','assadeiras','carrinhos','usuarios','enderecos_entrega','pedidos',
    'ordens_producao','cliente_assadeira_bloqueios','produto_assadeiras','produto_receitas',
    'producao_etapas_log','producao_massa_ingredientes','receita_ingredientes'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE EXCEPTION 'Tabela public.% não existe no banco', t;
    END IF;
    EXECUTE format(
      'CREATE TABLE interno.%I (LIKE public.%I INCLUDING ALL)',
      t, t
    );
  END LOOP;
END $$;

-- 2) Remover FKs de interno.* que referenciam public.*
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname,
           format('%I.%I', ns.nspname, cls.relname) AS src_tbl
    FROM pg_constraint c
    JOIN pg_class cls ON cls.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    JOIN pg_class clf ON clf.oid = c.confrelid
    JOIN pg_namespace nf ON nf.oid = clf.relnamespace
    WHERE c.contype = 'f'
      AND ns.nspname = 'interno'
      AND nf.nspname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.src_tbl, r.conname);
  END LOOP;
END $$;

-- 3) Copiar dados (ordem respeitando dependências)
INSERT INTO interno.empresas SELECT * FROM public.empresas;
INSERT INTO interno.parcelas SELECT * FROM public.parcelas;
INSERT INTO interno.tipos_estoque SELECT * FROM public.tipos_estoque;
INSERT INTO interno.categorias SELECT * FROM public.categorias;
INSERT INTO interno.unidades SELECT * FROM public.unidades;
INSERT INTO interno.masseiras SELECT * FROM public.masseiras;
INSERT INTO interno.receitas SELECT * FROM public.receitas;
INSERT INTO interno.insumos SELECT * FROM public.insumos;
INSERT INTO interno.clientes SELECT * FROM public.clientes;
INSERT INTO interno.produtos SELECT * FROM public.produtos;
INSERT INTO interno.assadeiras SELECT * FROM public.assadeiras;
INSERT INTO interno.carrinhos SELECT * FROM public.carrinhos;
INSERT INTO interno.usuarios SELECT * FROM public.usuarios;
INSERT INTO interno.enderecos_entrega SELECT * FROM public.enderecos_entrega;
INSERT INTO interno.pedidos SELECT * FROM public.pedidos;
INSERT INTO interno.ordens_producao SELECT * FROM public.ordens_producao;
INSERT INTO interno.cliente_assadeira_bloqueios SELECT * FROM public.cliente_assadeira_bloqueios;
INSERT INTO interno.produto_assadeiras SELECT * FROM public.produto_assadeiras;
INSERT INTO interno.produto_receitas SELECT * FROM public.produto_receitas;
INSERT INTO interno.producao_etapas_log SELECT * FROM public.producao_etapas_log;
INSERT INTO interno.producao_massa_ingredientes SELECT * FROM public.producao_massa_ingredientes;
INSERT INTO interno.receita_ingredientes SELECT * FROM public.receita_ingredientes;

-- 4) Recriar FKs apenas entre tabelas migradas (espelhando definições em public)
CREATE TEMP TABLE _migrated_tables (name text PRIMARY KEY);
INSERT INTO _migrated_tables (name) VALUES
  ('assadeiras'),('carrinhos'),('categorias'),('cliente_assadeira_bloqueios'),('clientes'),('empresas'),
  ('enderecos_entrega'),('insumos'),('masseiras'),('ordens_producao'),('parcelas'),('pedidos'),
  ('produto_assadeiras'),('produto_receitas'),('produtos'),('producao_etapas_log'),
  ('producao_massa_ingredientes'),('receita_ingredientes'),('receitas'),('tipos_estoque'),('unidades'),('usuarios');

DO $$
DECLARE
  r RECORD;
  fk_def text;
BEGIN
  FOR r IN
    SELECT
      c.conname,
      cls.relname AS src_tbl,
      pg_get_constraintdef(c.oid, true) AS def
    FROM pg_constraint c
    JOIN pg_class cls ON cls.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    JOIN pg_class clf ON clf.oid = c.confrelid
    JOIN pg_namespace nf ON nf.oid = clf.relnamespace
    WHERE c.contype = 'f'
      AND ns.nspname = 'public'
      AND nf.nspname = 'public'
      AND cls.relname IN (SELECT name FROM _migrated_tables)
      AND clf.relname IN (SELECT name FROM _migrated_tables)
  LOOP
    fk_def := replace(r.def, 'public.', 'interno.');
    EXECUTE format(
      'ALTER TABLE interno.%I ADD CONSTRAINT %I %s',
      r.src_tbl,
      r.conname,
      fk_def
    );
  END LOOP;
END $$;

-- 5) RLS + policies (via pg_policies: substitui referências public.* -> interno.* nas expressões)
DO $$
DECLARE
  pol RECORD;
  qual_expr text;
  with_expr text;
  roles_expr text;
  -- pg_policies.permissive: boolean em algumas versões; em outras é text (PERMISSIVE/RESTRICTIVE).
  policy_kind text;
BEGIN
  FOR pol IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      p.permissive,
      p.roles,
      p.cmd,
      p.qual,
      p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename IN (SELECT name FROM _migrated_tables)
  LOOP
    EXECUTE format('ALTER TABLE interno.%I ENABLE ROW LEVEL SECURITY', pol.tablename);

    qual_expr := pol.qual;
    with_expr := pol.with_check;
    IF qual_expr IS NOT NULL THEN
      qual_expr := replace(qual_expr, 'public.', 'interno.');
    END IF;
    IF with_expr IS NOT NULL THEN
      with_expr := replace(with_expr, 'public.', 'interno.');
    END IF;

    IF pol.roles IS NULL OR array_length(pol.roles, 1) IS NULL THEN
      roles_expr := 'PUBLIC';
    ELSE
      roles_expr := (
        SELECT string_agg(format('%I', rname), ', ')
        FROM unnest(pol.roles) AS rname
      );
    END IF;

    policy_kind := CASE lower(trim(pol.permissive::text))
      WHEN 'restrictive' THEN 'RESTRICTIVE'
      WHEN 'false' THEN 'RESTRICTIVE'
      WHEN 'f' THEN 'RESTRICTIVE'
      ELSE 'PERMISSIVE'
    END;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON interno.%I',
      pol.policyname,
      pol.tablename
    );

    IF pol.cmd = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON interno.%I AS %s FOR SELECT TO %s USING (%s)',
        pol.policyname,
        pol.tablename,
        policy_kind,
        roles_expr,
        COALESCE(qual_expr, 'true')
      );
    ELSIF pol.cmd = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON interno.%I AS %s FOR INSERT TO %s WITH CHECK (%s)',
        pol.policyname,
        pol.tablename,
        policy_kind,
        roles_expr,
        COALESCE(with_expr, 'true')
      );
    ELSIF pol.cmd = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON interno.%I AS %s FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        pol.policyname,
        pol.tablename,
        policy_kind,
        roles_expr,
        COALESCE(qual_expr, 'true'),
        COALESCE(with_expr, qual_expr, 'true')
      );
    ELSIF pol.cmd = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON interno.%I AS %s FOR DELETE TO %s USING (%s)',
        pol.policyname,
        pol.tablename,
        policy_kind,
        roles_expr,
        COALESCE(qual_expr, 'true')
      );
    ELSIF pol.cmd = 'ALL' THEN
      EXECUTE format(
        'CREATE POLICY %I ON interno.%I AS %s FOR ALL TO %s USING (%s) WITH CHECK (%s)',
        pol.policyname,
        pol.tablename,
        policy_kind,
        roles_expr,
        COALESCE(qual_expr, 'true'),
        COALESCE(with_expr, qual_expr, 'true')
      );
    END IF;
  END LOOP;
END $$;

-- 7) Grants alinhados ao uso típico Supabase (leitura anon/authenticated, CRUD service_role)
GRANT USAGE ON SCHEMA interno TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA interno TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA interno TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA interno TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA interno TO service_role, authenticated;

-- 8) Validação mínima (contagens)
DO $$
DECLARE
  t text;
  c_pub bigint;
  c_int bigint;
  tables text[] := ARRAY[
    'empresas','parcelas','tipos_estoque','categorias','unidades','masseiras','receitas','insumos',
    'clientes','produtos','assadeiras','carrinhos','usuarios','enderecos_entrega','pedidos',
    'ordens_producao','cliente_assadeira_bloqueios','produto_assadeiras','produto_receitas',
    'producao_etapas_log','producao_massa_ingredientes','receita_ingredientes'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I', t) INTO c_pub;
    EXECUTE format('SELECT COUNT(*) FROM interno.%I', t) INTO c_int;
    IF c_pub <> c_int THEN
      RAISE EXCEPTION 'Contagem divergente em %: public=% interno=%', t, c_pub, c_int;
    END IF;
  END LOOP;
END $$;

COMMIT;
