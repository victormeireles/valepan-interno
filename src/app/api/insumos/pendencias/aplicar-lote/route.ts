import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { InsumoVinculoLoteItem } from '@/domain/insumos/insumo-vinculo-sugestao';
import { insumoVinculoLoteApplier } from '@/lib/services/insumo-vinculo-lote-applier';

function parseItens(body: unknown): InsumoVinculoLoteItem[] {
  if (!body || typeof body !== 'object' || !('itens' in body)) return [];
  const raw = (body as { itens: unknown }).itens;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is InsumoVinculoLoteItem => {
      if (!item || typeof item !== 'object') return false;
      const typed = item as InsumoVinculoLoteItem;
      return (
        typeof typed.empresaId === 'string' &&
        Number.isFinite(typed.omieIdProduto) &&
        (typed.acao === 'vincular' || typed.acao === 'ignorar') &&
        Array.isArray(typed.pendenciaIds)
      );
    })
    .map((item) => ({
      empresaId: item.empresaId,
      omieIdProduto: item.omieIdProduto,
      acao: item.acao,
      insumoId: item.insumoId,
      fatorConversao: item.fatorConversao,
      pendenciaIds: item.pendenciaIds,
    }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const itens = parseItens(body);
    if (itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item válido para aplicar' }, { status: 400 });
    }

    const resultado = await insumoVinculoLoteApplier.aplicar(itens);
    revalidatePath('/estoque-insumos');

    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao aplicar lote';
    console.error('Erro em /api/insumos/pendencias/aplicar-lote:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
