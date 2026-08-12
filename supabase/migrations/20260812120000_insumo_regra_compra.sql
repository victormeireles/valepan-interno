-- Regras de compra de insumos (sugestão automática)

CREATE TABLE IF NOT EXISTS public.insumo_regra_compra (
  insumo_id uuid PRIMARY KEY REFERENCES public.insumos(id) ON DELETE CASCADE,
  lead_time_dias integer NOT NULL CHECK (lead_time_dias > 0),
  janela_tipo text NOT NULL DEFAULT 'qualquer'
    CHECK (janela_tipo IN ('qualquer', 'dias_semana')),
  dias_semana smallint[] NULL,
  quantidade_minima numeric NULL,
  quantidade_maxima numeric NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insumo_regra_compra_janela_dias_check
    CHECK (
      (janela_tipo = 'qualquer' AND dias_semana IS NULL)
      OR (
        janela_tipo = 'dias_semana'
        AND dias_semana IS NOT NULL
        AND cardinality(dias_semana) > 0
      )
    ),
  CONSTRAINT insumo_regra_compra_min_max_check
    CHECK (
      quantidade_minima IS NULL
      OR quantidade_maxima IS NULL
      OR quantidade_minima <= quantidade_maxima
    )
);

CREATE TABLE IF NOT EXISTS public.insumo_distribuidor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (length(trim(nome)) > 0),
  preferencial boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_insumo_distribuidor_preferencial
  ON public.insumo_distribuidor (insumo_id)
  WHERE preferencial = true;

CREATE INDEX IF NOT EXISTS idx_insumo_distribuidor_insumo
  ON public.insumo_distribuidor (insumo_id);

ALTER TABLE public.insumo_regra_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumo_distribuidor ENABLE ROW LEVEL SECURITY;

CREATE POLICY insumo_regra_compra_select ON public.insumo_regra_compra
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insumo_regra_compra_insert ON public.insumo_regra_compra
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY insumo_regra_compra_update ON public.insumo_regra_compra
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY insumo_regra_compra_delete ON public.insumo_regra_compra
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

CREATE POLICY insumo_distribuidor_select ON public.insumo_distribuidor
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insumo_distribuidor_insert ON public.insumo_distribuidor
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY insumo_distribuidor_update ON public.insumo_distribuidor
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY insumo_distribuidor_delete ON public.insumo_distribuidor
  FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.insumo_regra_compra IS
  'Parâmetros de reposição (lead time, janela, min/max) para sugestão de compra';
COMMENT ON TABLE public.insumo_distribuidor IS
  'Distribuidores de compra por insumo (um preferencial)';
