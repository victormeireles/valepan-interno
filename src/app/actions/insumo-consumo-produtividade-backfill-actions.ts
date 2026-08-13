'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import type { ProdutividadeConsumoChange } from '@/domain/insumos/insumo-consumo-produtividade-change';
import { InsumoConsumoProdutividadeFator } from '@/domain/insumos/insumo-consumo-produtividade-change';
import {
  insumoConsumoProdutividadeBackfillService,
  type ConsumoProdutividadeBackfillPreview,
  type ConsumoProdutividadeBackfillResult,
} from '@/lib/services/insumo-consumo-produtividade-backfill-service';
import { revalidatePath } from 'next/cache';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDesde(desde?: string | null): string | null {
  if (!desde) return null;
  const trimmed = desde.trim();
  if (!trimmed) return null;
  if (!ISO_DATE_PATTERN.test(trimmed)) {
    throw new Error('Data inicial inválida. Use o formato AAAA-MM-DD.');
  }
  return trimmed;
}

function changesValidos(changes: ProdutividadeConsumoChange[]): ProdutividadeConsumoChange[] {
  return changes.filter(
    (change) =>
      InsumoConsumoProdutividadeFator.mudou(change) &&
      change.quantidadeAntes > 0 &&
      change.quantidadeDepois > 0,
  );
}

export async function previewConsumoProdutividadeBackfill(input: {
  changes: ProdutividadeConsumoChange[];
  desde?: string | null;
}): Promise<{ success: true; preview: ConsumoProdutividadeBackfillPreview } | { success: false; error: string }> {
  try {
    await requireInternoModulo('interno_config', 'administrar');
    const preview = await insumoConsumoProdutividadeBackfillService.preview(
      changesValidos(input.changes),
      normalizeDesde(input.desde),
    );
    return { success: true, preview };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao estimar backfill';
    return { success: false, error: message };
  }
}

export async function aplicarConsumoProdutividadeBackfill(input: {
  changes: ProdutividadeConsumoChange[];
  desde?: string | null;
}): Promise<{ success: true; result: ConsumoProdutividadeBackfillResult } | { success: false; error: string }> {
  try {
    await requireInternoModulo('interno_config', 'administrar');
    const result = await insumoConsumoProdutividadeBackfillService.apply(
      changesValidos(input.changes),
      normalizeDesde(input.desde),
    );
    revalidatePath('/consumo-insumos');
    revalidatePath('/config/insumos');
    return { success: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao aplicar backfill';
    return { success: false, error: message };
  }
}
