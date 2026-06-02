-- Produtos fictícios para desenvolvimento / testes no planejamento (autocomplete "Nova ordem").
-- Executar no SQL Editor do Supabase (mesmo projeto/schema que a app usa — normalmente `interno`).
-- Idempotente: pode executar várias vezes sem duplicar linhas (usa códigos fixos DEV-*).
--
-- Depois de correr: na fila de planejamento, busque por "dev", "fake" ou pelo código DEV-FAKE-*.

DO $$
DECLARE
  uid_un uuid;
  uid_lt uuid;
  cid uuid;
  pid_un uuid;
  pid_lt uuid;
  pid_cx uuid;
  aid uuid;
BEGIN
  -- Unidade para modo "unidades" (nome_resumido = un)
  SELECT id INTO uid_un FROM interno.unidades WHERE codigo = 'DEV_PLAN_UN' LIMIT 1;
  IF uid_un IS NULL THEN
    INSERT INTO interno.unidades (codigo, nome, nome_resumido, ativo)
    VALUES ('DEV_PLAN_UN', 'Fake dev — consumo (un)', 'un', true)
    RETURNING id INTO uid_un;
  END IF;

  -- Unidade para modo latas na UI (nome_resumido contém contexto LT)
  SELECT id INTO uid_lt FROM interno.unidades WHERE codigo = 'DEV_PLAN_LT' LIMIT 1;
  IF uid_lt IS NULL THEN
    INSERT INTO interno.unidades (codigo, nome, nome_resumido, ativo)
    VALUES ('DEV_PLAN_LT', 'Fake dev — lata (LT)', 'LT', true)
    RETURNING id INTO uid_lt;
  END IF;

  SELECT id INTO cid FROM interno.categorias WHERE nome = '_Dev fake planejamento' LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO interno.categorias (nome, ativo, aparece_por_padrao)
    VALUES ('_Dev fake planejamento', true, false)
    RETURNING id INTO cid;
  END IF;

  SELECT id INTO pid_un FROM interno.produtos WHERE codigo = 'DEV-FAKE-UN' LIMIT 1;
  IF pid_un IS NULL THEN
    INSERT INTO interno.produtos (
      categoria_id,
      codigo,
      nome,
      unidade,
      ativo,
      unidade_padrao_id,
      package_units,
      box_units,
      unidades_assadeira,
      unidades_lata_antiga,
      unidades_lata_nova,
      permite_lata_antiga,
      permite_lata_nova,
      latas_cadastro_conferido
    )
    VALUES (
      cid,
      'DEV-FAKE-UN',
      '[DEV] Produto fake — unidades',
      'un',
      true,
      uid_un,
      1,
      8,
      60,
      60,
      64,
      true,
      true,
      true
    );
  END IF;

  SELECT id INTO pid_lt FROM interno.produtos WHERE codigo = 'DEV-FAKE-LT' LIMIT 1;
  IF pid_lt IS NULL THEN
    INSERT INTO interno.produtos (
      categoria_id,
      codigo,
      nome,
      unidade,
      ativo,
      unidade_padrao_id,
      package_units,
      box_units,
      unidades_assadeira,
      unidades_lata_antiga,
      unidades_lata_nova,
      permite_lata_antiga,
      permite_lata_nova,
      latas_cadastro_conferido
    )
    VALUES (
      cid,
      'DEV-FAKE-LT',
      '[DEV] Produto fake — latas',
      'un',
      true,
      uid_lt,
      1,
      8,
      60,
      60,
      64,
      true,
      true,
      true
    );
  END IF;

  SELECT id INTO pid_cx FROM interno.produtos WHERE codigo = 'DEV-FAKE-CX' LIMIT 1;
  IF pid_cx IS NULL THEN
    INSERT INTO interno.produtos (
      categoria_id,
      codigo,
      nome,
      unidade,
      ativo,
      unidade_padrao_id,
      package_units,
      box_units,
      unidades_assadeira,
      unidades_lata_antiga,
      unidades_lata_nova,
      permite_lata_antiga,
      permite_lata_nova,
      latas_cadastro_conferido
    )
    VALUES (
      cid,
      'DEV-FAKE-CX',
      '[DEV] Produto fake — caixas',
      'un',
      true,
      uid_un,
      12,
      6,
      NULL,
      NULL,
      NULL,
      false,
      false,
      true
    );
  END IF;

  -- Liga os produtos com lata a uma assadeira real (primeira ativa), para o dropdown "tipo de lata" no modal.
  SELECT id INTO aid FROM interno.assadeiras WHERE ativo = true ORDER BY ordem NULLS LAST, nome LIMIT 1;

  SELECT id INTO pid_un FROM interno.produtos WHERE codigo = 'DEV-FAKE-UN' LIMIT 1;
  SELECT id INTO pid_lt FROM interno.produtos WHERE codigo = 'DEV-FAKE-LT' LIMIT 1;

  IF aid IS NOT NULL AND pid_un IS NOT NULL THEN
    INSERT INTO interno.produto_assadeiras (produto_id, assadeira_id, unidades_por_assadeira)
    SELECT pid_un, aid, 60
    WHERE NOT EXISTS (
      SELECT 1
      FROM interno.produto_assadeiras pa
      WHERE pa.produto_id = pid_un AND pa.assadeira_id = aid
    );
  END IF;

  IF aid IS NOT NULL AND pid_lt IS NOT NULL THEN
    INSERT INTO interno.produto_assadeiras (produto_id, assadeira_id, unidades_por_assadeira)
    SELECT pid_lt, aid, 60
    WHERE NOT EXISTS (
      SELECT 1
      FROM interno.produto_assadeiras pa
      WHERE pa.produto_id = pid_lt AND pa.assadeira_id = aid
    );
  END IF;
END $$;
