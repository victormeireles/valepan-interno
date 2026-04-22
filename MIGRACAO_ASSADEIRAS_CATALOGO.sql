-- =============================================================================
-- Catálogo de assadeiras + vínculos produto/cliente (Supabase / Postgres)
-- Execute no SQL Editor após revisar. Idempotente onde faz sentido (IF NOT EXISTS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tipos de assadeira (lata, bandeja, etc.) — quantos forem necessários no futuro
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assadeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assadeiras_nome_nao_vazio CHECK (length(trim(nome)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS assadeiras_codigo_unique
  ON public.assadeiras (codigo)
  WHERE codigo IS NOT NULL AND length(trim(codigo)) > 0;

COMMENT ON TABLE public.assadeiras IS
  'Catálogo de tipos de assadeira (independente de “antiga/nova” no nome).';

COMMENT ON COLUMN public.assadeiras.ordem IS
  'Sugestão de ordenação na UI (menor primeiro).';

-- -----------------------------------------------------------------------------
-- 2) Produto pode usar uma ou mais assadeiras; unidades por tipo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.produto_assadeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos (id) ON DELETE CASCADE,
  assadeira_id uuid NOT NULL REFERENCES public.assadeiras (id) ON DELETE RESTRICT,
  unidades_por_assadeira integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT produto_assadeiras_unidades_positivas CHECK (unidades_por_assadeira > 0),
  CONSTRAINT produto_assadeiras_produto_assadeira_unique UNIQUE (produto_id, assadeira_id)
);

CREATE INDEX IF NOT EXISTS produto_assadeiras_produto_id_idx ON public.produto_assadeiras (produto_id);
CREATE INDEX IF NOT EXISTS produto_assadeiras_assadeira_id_idx ON public.produto_assadeiras (assadeira_id);

COMMENT ON TABLE public.produto_assadeiras IS
  'Quais assadeiras o produto pode usar e quantas unidades do produto cabem em cada uma.';

-- -----------------------------------------------------------------------------
-- 3) Cliente restrito a certos tipos de assadeira (whitelist)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cliente_assadeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes (id) ON DELETE CASCADE,
  assadeira_id uuid NOT NULL REFERENCES public.assadeiras (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cliente_assadeiras_cliente_assadeira_unique UNIQUE (cliente_id, assadeira_id)
);

CREATE INDEX IF NOT EXISTS cliente_assadeiras_cliente_id_idx ON public.cliente_assadeiras (cliente_id);
CREATE INDEX IF NOT EXISTS cliente_assadeiras_assadeira_id_idx ON public.cliente_assadeiras (assadeira_id);

COMMENT ON TABLE public.cliente_assadeiras IS
  'Assadeiras permitidas para o cliente. Ver regra de “lista vazia” no bloco de comentários abaixo.';

-- -----------------------------------------------------------------------------
-- Regra de negócio — lista vazia por cliente (ESCOLHER UMA e documentar no app)
-- -----------------------------------------------------------------------------
-- Opção A (comum): se NÃO existir nenhuma linha em cliente_assadeiras para o cliente,
--   considerar que ele pode usar qualquer assadeira que o produto tenha em produto_assadeiras
--   (desde que exista interseção).
-- Opção B (restritiva): lista vazia = nenhuma assadeira permitida até cadastrar.
--
-- Na OP/pedido: assadeiras elegíveis = interseção entre
--   { assadeiras do produto } e { assadeiras do cliente conforme regra A ou B }.

-- -----------------------------------------------------------------------------
-- Trigger genérico updated_at (reutiliza extensão comum; se não existir, criar função)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assadeiras_set_updated_at ON public.assadeiras;
CREATE TRIGGER trg_assadeiras_set_updated_at
  BEFORE UPDATE ON public.assadeiras
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_produto_assadeiras_set_updated_at ON public.produto_assadeiras;
CREATE TRIGGER trg_produto_assadeiras_set_updated_at
  BEFORE UPDATE ON public.produto_assadeiras
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cadastro de latas: número de buracos e descrição (idempotente)
-- -----------------------------------------------------------------------------
ALTER TABLE public.assadeiras
  ADD COLUMN IF NOT EXISTS numero_buracos integer NOT NULL DEFAULT 0;
ALTER TABLE public.assadeiras
  ADD COLUMN IF NOT EXISTS descricao text NULL;
ALTER TABLE public.assadeiras
  ADD COLUMN IF NOT EXISTS diametro_buracos_mm numeric NULL;

-- =============================================================================
-- OPCIONAL: seeds mínimos (descomente se quiser criar dois tipos iniciais)
-- =============================================================================
-- INSERT INTO public.assadeiras (nome, codigo, ordem) VALUES
--   ('Lata antiga', 'LT_ANTIGA', 1),
--   ('Lata nova', 'LT_NOVA', 2)
-- ON CONFLICT DO NOTHING;

-- =============================================================================
-- OPCIONAL: migração a partir de colunas legadas em produtos (se existirem)
-- Ajuste nomes/IDs conforme sua base; rode só depois de criar assadeiras de destino.
-- =============================================================================
-- INSERT INTO public.produto_assadeiras (produto_id, assadeira_id, unidades_por_assadeira)
-- SELECT p.id, 'UUID-ASSADEIRA-ANTIGA', p.unidades_lata_antiga
-- FROM public.produtos p
-- WHERE p.unidades_lata_antiga IS NOT NULL
-- ON CONFLICT (produto_id, assadeira_id) DO UPDATE
-- SET unidades_por_assadeira = EXCLUDED.unidades_por_assadeira, updated_at = now();
--
-- INSERT INTO public.produto_assadeiras (produto_id, assadeira_id, unidades_por_assadeira)
-- SELECT p.id, 'UUID-ASSADEIRA-NOVA', p.unidades_lata_nova
-- FROM public.produtos p
-- WHERE p.unidades_lata_nova IS NOT NULL
-- ON CONFLICT (produto_id, assadeira_id) DO UPDATE
-- SET unidades_por_assadeira = EXCLUDED.unidades_por_assadeira, updated_at = now();
