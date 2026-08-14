'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import type { ProdutividadeConsumoChange } from '@/domain/insumos/insumo-consumo-produtividade-change';
import { InsumoConsumoProdutividadeFator } from '@/domain/insumos/insumo-consumo-produtividade-change';
import { insumoConsumoProdutividadeLoteRepository } from '@/data/insumos/InsumoConsumoProdutividadeLoteRepository';
import {
  insumoConsumoProdutividadeBackfillService,
  type ConsumoProdutividadeBackfillPreview,
  type ConsumoProdutividadeBackfillResult,
} from '@/lib/services/insumo-consumo-produtividade-backfill-service';
import { insumoConsumoEmbalagemBackfillBatchService } from '@/lib/services/insumo-consumo-embalagem-backfill-batch-service';
import { insumoConsumoFornoBackfillBatchService } from '@/lib/services/insumo-consumo-forno-backfill-batch-service';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
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
      InsumoConsumoProdutividadeFator.deveBackfill(change) &&
      change.quantidadeAntes > 0 &&
      change.quantidadeDepois > 0,
  );
}

async function buildChangesEmbalagemPorInsumo(
  insumoId: string,
): Promise<ProdutividadeConsumoChange[]> {
  const produtos =
    await insumoConsumoProdutividadeLoteRepository.listProdutosEmbalagemPorInsumo(insumoId);
  return produtos.map((produto) => ({
    produtoId: produto.produtoId,
    produtoNome: produto.produtoNome,
    tipo: 'embalagem' as const,
    receitaId: produto.receitaId,
    quantidadeAntes: produto.quantidadePorProduto,
    quantidadeDepois: produto.quantidadePorProduto,
    forcarReconciliar: true,
  }));
}

export async function resolverInsumoIdPorNome(
  nome: string,
): Promise<{ success: true; insumoId: string } | { success: false; error: string }> {
  try {
    await requireInternoModulo('interno_config', 'administrar');
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from('insumos')
      .select('id')
      .eq('nome', nome)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) {
      return { success: false, error: `Insumo não encontrado: ${nome}` };
    }
    return { success: true, insumoId: data.id as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar insumo';
    return { success: false, error: message };
  }
}

export async function previewConsumoProdutividadeBackfill(input: {
  changes: ProdutividadeConsumoChange[];
  desde?: string | null;
}): Promise<
  { success: true; preview: ConsumoProdutividadeBackfillPreview } | { success: false; error: string }
> {
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
}): Promise<
  { success: true; result: ConsumoProdutividadeBackfillResult } | { success: false; error: string }
> {
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

export async function previewBackfillEmbalagemPorInsumo(input: {
  insumoId: string;
  desde?: string | null;
}): Promise<
  | { success: true; preview: ConsumoProdutividadeBackfillPreview; produtos: number }
  | { success: false; error: string }
> {
  try {
    await requireInternoModulo('interno_config', 'administrar');
    const changes = await buildChangesEmbalagemPorInsumo(input.insumoId);
    const preview = await insumoConsumoProdutividadeBackfillService.preview(
      changesValidos(changes),
      normalizeDesde(input.desde),
    );
    return { success: true, preview, produtos: changes.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao estimar backfill';
    return { success: false, error: message };
  }
}

export async function aplicarBackfillEmbalagemPorInsumo(input: {
  insumoId: string;
  desde?: string | null;
}): Promise<
  | { success: true; result: ConsumoProdutividadeBackfillResult; produtos: number }
  | { success: false; error: string }
> {
  try {
    await requireInternoModulo('interno_config', 'administrar');
    const result = await insumoConsumoEmbalagemBackfillBatchService.applyPorInsumoEmbalagem(
      input.insumoId,
      normalizeDesde(input.desde),
    );
    revalidatePath('/consumo-insumos');
    revalidatePath('/config/insumos');
    return {
      success: true,
      result: {
        lotesProcessados: result.lotesProcessados,
        movimentosInseridos: result.movimentosInseridos,
        avisos: result.avisos,
      },
      produtos: result.produtos,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao aplicar backfill';
    return { success: false, error: message };
  }
}

export async function previewBackfillFornoPorInsumo(input: {
  insumoId: string;
  desde?: string | null;
}): Promise<
  | { success: true; preview: ConsumoProdutividadeBackfillPreview; produtos: number }
  | { success: false; error: string }
> {
  try {
    await requireInternoModulo('interno_config', 'administrar');
    const produtos =
      await insumoConsumoProdutividadeLoteRepository.listProdutosFornoPorInsumo(input.insumoId);
    const unicos = new Map(
      produtos.map((p) => [
        p.produtoId,
        {
          produtoId: p.produtoId,
          produtoNome: p.produtoNome,
          tipo: 'brilho' as const,
          receitaId: p.receitaId,
          quantidadeAntes: p.quantidadePorProduto,
          quantidadeDepois: p.quantidadePorProduto,
          forcarReconciliar: true,
        },
      ]),
    );
    const changes = [...unicos.values()];
    const preview = await insumoConsumoProdutividadeBackfillService.preview(
      changesValidos(changes),
      normalizeDesde(input.desde),
    );
    return { success: true, preview, produtos: changes.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao estimar backfill';
    return { success: false, error: message };
  }
}

export async function aplicarBackfillFornoPorInsumo(input: {
  insumoId: string;
  desde?: string | null;
}): Promise<
  | { success: true; result: ConsumoProdutividadeBackfillResult; produtos: number }
  | { success: false; error: string }
> {
  try {
    await requireInternoModulo('interno_config', 'administrar');
    const result = await insumoConsumoFornoBackfillBatchService.applyPorInsumo(
      input.insumoId,
      normalizeDesde(input.desde),
    );
    revalidatePath('/consumo-insumos');
    revalidatePath('/config/insumos');
    return {
      success: true,
      result: {
        lotesProcessados: result.lotesProcessados,
        movimentosInseridos: result.movimentosInseridos,
        avisos: result.avisos,
      },
      produtos: result.produtos,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao aplicar backfill';
    return { success: false, error: message };
  }
}
