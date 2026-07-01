-- Saída de insumos por produção (forno + embalagem) — Fases 2b e 2c

ALTER TYPE public.insumo_movimento_origem ADD VALUE IF NOT EXISTS 'producao_forno';
ALTER TYPE public.insumo_movimento_origem ADD VALUE IF NOT EXISTS 'producao_embalagem';

ALTER TABLE public.insumo_movimentos
  ADD COLUMN IF NOT EXISTS forno_lote_id uuid
    REFERENCES public.forno_lotes(id) ON DELETE SET NULL;

ALTER TABLE public.insumo_movimentos
  ADD COLUMN IF NOT EXISTS embalagem_lote_id uuid
    REFERENCES public.embalagem_lotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_insumo_mov_forno_lote
  ON public.insumo_movimentos(forno_lote_id)
  WHERE forno_lote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_insumo_mov_embalagem_lote
  ON public.insumo_movimentos(embalagem_lote_id)
  WHERE embalagem_lote_id IS NOT NULL;
