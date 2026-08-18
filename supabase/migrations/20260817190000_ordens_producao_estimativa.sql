-- Cronograma previsto 1:1 por ordem de produção.
-- Recalculado sempre que a fila, as quantidades ou os parâmetros de operação mudam.

CREATE TABLE IF NOT EXISTS public.ordens_producao_estimativa (
  ordem_producao_id uuid PRIMARY KEY
    REFERENCES public.ordens_producao(id) ON DELETE CASCADE,
  fermentacao_inicio_previsto timestamptz NOT NULL,
  fermentacao_fim_previsto timestamptz NOT NULL,
  camara_fim_previsto timestamptz NOT NULL,
  forno_inicio_previsto timestamptz NOT NULL,
  forno_fim_previsto timestamptz NOT NULL,
  resfriamento_fim_previsto timestamptz NOT NULL,
  embalagem_inicio_previsto timestamptz NOT NULL,
  embalagem_fim_previsto timestamptz NOT NULL,
  taxa_assadeiras_hora_producao numeric NOT NULL,
  taxa_assadeiras_hora_forno numeric NOT NULL,
  taxa_caixas_hora_embalagem numeric NOT NULL,
  tempo_medio_fermentacao_min integer NOT NULL,
  tempo_medio_resfriamento_min integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ordens_producao_estimativa_taxas_chk
    CHECK (
      taxa_assadeiras_hora_producao > 0
      AND taxa_assadeiras_hora_forno > 0
      AND taxa_caixas_hora_embalagem > 0
    ),
  CONSTRAINT ordens_producao_estimativa_tempos_chk
    CHECK (
      tempo_medio_fermentacao_min > 0
      AND tempo_medio_resfriamento_min > 0
    )
);

CREATE INDEX IF NOT EXISTS ordens_producao_estimativa_updated_at_idx
  ON public.ordens_producao_estimativa (updated_at DESC);

ALTER TABLE public.ordens_producao_estimativa ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ordens_producao_estimativa FROM anon, authenticated;
GRANT ALL ON TABLE public.ordens_producao_estimativa TO service_role;

COMMENT ON TABLE public.ordens_producao_estimativa IS
  'Horários previstos da linha do tempo por ordem de produção (plano vigente).';
