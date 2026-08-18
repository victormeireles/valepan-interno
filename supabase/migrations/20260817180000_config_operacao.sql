-- Parâmetros globais de operação (singleton).
-- Turnos do 1º horário e tempos médios de fermentação/resfriamento.

CREATE TABLE IF NOT EXISTS public.config_operacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horario_inicio_producao time NOT NULL DEFAULT '07:00',
  horario_fim_producao time NOT NULL DEFAULT '18:00',
  horario_inicio_forno time NOT NULL DEFAULT '07:00',
  horario_fim_forno time NOT NULL DEFAULT '18:00',
  horario_inicio_embalagem time NOT NULL DEFAULT '07:00',
  horario_fim_embalagem time NOT NULL DEFAULT '21:50',
  tempo_medio_fermentacao_min integer NOT NULL DEFAULT 180,
  tempo_medio_resfriamento_min integer NOT NULL DEFAULT 60,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_operacao_producao_janela_chk
    CHECK (horario_fim_producao > horario_inicio_producao),
  CONSTRAINT config_operacao_forno_janela_chk
    CHECK (horario_fim_forno > horario_inicio_forno),
  CONSTRAINT config_operacao_embalagem_janela_chk
    CHECK (horario_fim_embalagem > horario_inicio_embalagem),
  CONSTRAINT config_operacao_fermentacao_min_chk
    CHECK (tempo_medio_fermentacao_min > 0),
  CONSTRAINT config_operacao_resfriamento_min_chk
    CHECK (tempo_medio_resfriamento_min > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS config_operacao_singleton
  ON public.config_operacao ((true));

ALTER TABLE public.config_operacao ENABLE ROW LEVEL SECURITY;

INSERT INTO public.config_operacao (
  horario_inicio_producao,
  horario_fim_producao,
  horario_inicio_forno,
  horario_fim_forno,
  horario_inicio_embalagem,
  horario_fim_embalagem,
  tempo_medio_fermentacao_min,
  tempo_medio_resfriamento_min
)
SELECT '07:00', '18:00', '07:00', '18:00', '07:00', '21:50', 180, 60
WHERE NOT EXISTS (SELECT 1 FROM public.config_operacao LIMIT 1);

COMMENT ON TABLE public.config_operacao IS
  'Parâmetros globais de operação: turnos e tempos médios de processo.';
