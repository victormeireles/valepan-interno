-- Cadastro de tipos de caixa/embalagem por tipo de cliente (conversão latas → unidades → caixas na ordem diária).
-- Pré-requisito: enum interno.tipo_cliente_enum (distribuidor | hamburgueria).

CREATE TABLE IF NOT EXISTS interno.embalagens_cadastro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo_cliente text NOT NULL
    CHECK (tipo_cliente IN ('distribuidor', 'hamburgueria')),
  unidades_por_caixa integer NOT NULL CHECK (unidades_por_caixa > 0),
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT embalagens_cadastro_tipo_nome_unique UNIQUE (tipo_cliente, nome)
);

DROP TRIGGER IF EXISTS trg_embalagens_cadastro_set_updated_at ON interno.embalagens_cadastro;
CREATE TRIGGER trg_embalagens_cadastro_set_updated_at
  BEFORE UPDATE ON interno.embalagens_cadastro
  FOR EACH ROW
  EXECUTE PROCEDURE interno.set_updated_at();

COMMENT ON TABLE interno.embalagens_cadastro IS
  'Modelos de caixa por tipo de cliente; unidades_por_caixa = pães/unidades por caixa para estimativa na ordem diária.';

ALTER TABLE interno.ordens_producao_diarias_itens
  ADD COLUMN IF NOT EXISTS embalagem_cadastro_id uuid NULL
    REFERENCES interno.embalagens_cadastro (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ordens_producao_diarias_itens_embalagem_idx
  ON interno.ordens_producao_diarias_itens (embalagem_cadastro_id)
  WHERE embalagem_cadastro_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE interno.embalagens_cadastro TO authenticated;
GRANT ALL ON TABLE interno.embalagens_cadastro TO service_role;
