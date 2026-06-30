-- Saída de insumos por produção (fermentação) — Fase 2a

ALTER TABLE public.insumo_saldos
  ALTER COLUMN quantidade TYPE numeric(14, 6);

ALTER TABLE public.insumo_movimentos
  ALTER COLUMN delta_quantidade TYPE numeric(14, 6),
  ALTER COLUMN saldo_resultante TYPE numeric(14, 6);

ALTER TABLE public.insumo_saldos
  DROP CONSTRAINT IF EXISTS insumo_saldos_quantidade_check;

ALTER TABLE public.insumo_movimentos
  DROP CONSTRAINT IF EXISTS insumo_movimentos_saldo_resultante_check;

ALTER TYPE public.insumo_movimento_origem ADD VALUE IF NOT EXISTS 'producao_fermentacao';

ALTER TABLE public.insumo_movimentos
  ADD COLUMN IF NOT EXISTS fermentacao_lote_id uuid
    REFERENCES public.fermentacao_lotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_insumo_mov_fermentacao_lote
  ON public.insumo_movimentos(fermentacao_lote_id)
  WHERE fermentacao_lote_id IS NOT NULL;
