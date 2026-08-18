-- Janela pode atravessar a meia-noite (ex.: embalagem 07:00 → 05:00).
-- Duração zero (início = fim) continua inválida.

ALTER TABLE public.config_operacao
  DROP CONSTRAINT IF EXISTS config_operacao_producao_janela_chk,
  DROP CONSTRAINT IF EXISTS config_operacao_forno_janela_chk,
  DROP CONSTRAINT IF EXISTS config_operacao_embalagem_janela_chk;

ALTER TABLE public.config_operacao
  ADD CONSTRAINT config_operacao_producao_janela_chk
    CHECK (horario_fim_producao <> horario_inicio_producao),
  ADD CONSTRAINT config_operacao_forno_janela_chk
    CHECK (horario_fim_forno <> horario_inicio_forno),
  ADD CONSTRAINT config_operacao_embalagem_janela_chk
    CHECK (horario_fim_embalagem <> horario_inicio_embalagem);
