-- Cadastro de carrinhos (fermentação / movimentação)
CREATE TABLE IF NOT EXISTS public.carrinhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL,
  bandejas integer NOT NULL DEFAULT 0,
  precisa_reparos boolean NOT NULL DEFAULT false,
  quantidade_latas integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carrinhos_numero_positive CHECK (numero > 0),
  CONSTRAINT carrinhos_bandejas_non_negative CHECK (bandejas >= 0),
  CONSTRAINT carrinhos_quantidade_latas_non_negative CHECK (quantidade_latas >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS carrinhos_numero_unique ON public.carrinhos (numero);

CREATE INDEX IF NOT EXISTS carrinhos_ativo_idx ON public.carrinhos (ativo);

COMMENT ON TABLE public.carrinhos IS 'Carrinhos da produção: capacidade em bandejas/latas e manutenção.';
COMMENT ON COLUMN public.carrinhos.numero IS 'Identificador numérico do carrinho (único).';
COMMENT ON COLUMN public.carrinhos.bandejas IS 'Quantidade de bandejas do carrinho.';
COMMENT ON COLUMN public.carrinhos.precisa_reparos IS 'Se o carrinho precisa de reparos.';
COMMENT ON COLUMN public.carrinhos.quantidade_latas IS 'Capacidade máxima de latas que cabem no carrinho.';

ALTER TABLE public.carrinhos
  ADD COLUMN IF NOT EXISTS em_uso boolean NOT NULL DEFAULT false;

ALTER TABLE public.carrinhos
  ADD COLUMN IF NOT EXISTS latas_ocupadas integer NOT NULL DEFAULT 0;

ALTER TABLE public.carrinhos
  DROP CONSTRAINT IF EXISTS carrinhos_latas_ocupadas_non_negative;

ALTER TABLE public.carrinhos
  ADD CONSTRAINT carrinhos_latas_ocupadas_non_negative CHECK (latas_ocupadas >= 0);

CREATE INDEX IF NOT EXISTS carrinhos_em_uso_idx ON public.carrinhos (em_uso);

COMMENT ON COLUMN public.carrinhos.em_uso IS 'Se o carrinho está alocado (fermentação, fila, embalagem, etc.).';
COMMENT ON COLUMN public.carrinhos.latas_ocupadas IS 'Quantas latas estão no carrinho no momento (quando em uso).';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_carrinhos_set_updated_at ON public.carrinhos;
CREATE TRIGGER trg_carrinhos_set_updated_at
  BEFORE UPDATE ON public.carrinhos
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
