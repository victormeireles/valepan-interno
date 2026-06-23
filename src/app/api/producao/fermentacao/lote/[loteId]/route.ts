import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import { fermentacaoLoteService } from '@/lib/services/fermentacao-lote-service';
import { notifyEtapaProductionAfterLoteSave } from '@/lib/services/etapa-production-notification';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ loteId: string }> },
) {
  try {
    const { loteId } = await context.params;
    if (!loteId?.trim()) {
      return NextResponse.json({ error: 'ID do lote inválido' }, { status: 400 });
    }

    const lote = await fermentacaoLoteRepository.findById(loteId);
    if (!lote) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    const ordem = await ordemProducaoRepository.findById(lote.ordemProducaoId);
    if (!ordem) {
      return NextResponse.json({ error: 'Ordem de produção não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      loteId: lote.id,
      ordemProducaoId: lote.ordemProducaoId,
      data: {
        assadeiras: lote.assadeiras,
        unidades: lote.unidades,
        pedidoAssadeiras: ordem.assadeiras,
        pedidoUnidades: ordem.quantidade.unidades,
        pedidoKg: ordem.quantidade.kg,
        fotoUrl: lote.fotos?.fotoUrl,
        fotoId: lote.fotos?.fotoId,
        fotoUploadedAt: lote.fotos?.fotoUploadedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ loteId: string }> },
) {
  try {
    const { loteId } = await context.params;
    if (!loteId?.trim()) {
      return NextResponse.json({ error: 'ID do lote inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { assadeiras, unidades, fotoUrl, fotoId, fotoUploadedAt, continuaProduzindo } = body;
    const loteAssadeiras = Number(assadeiras) || 0;
    const loteUnidades = Number(unidades) || 0;

    if (loteAssadeiras < 0 || loteUnidades < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    const lote = await fermentacaoLoteRepository.findById(loteId);
    if (!lote) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    await fermentacaoLoteService.atualizarLote(loteId, {
      quantidade: { assadeiras: loteAssadeiras, unidades: loteUnidades },
      fotos: {
        fotoUrl: fotoUrl || undefined,
        fotoId: fotoId || undefined,
        fotoUploadedAt: fotoUploadedAt || undefined,
      },
      continuaProduzindo: continuaProduzindo ?? true,
    });

    try {
      const ordem = await ordemProducaoRepository.findById(lote.ordemProducaoId);
      if (ordem) {
        const [produto, lotesByOrdem] = await Promise.all([
          new SupabaseProductService().findById(ordem.produtoId),
          fermentacaoLoteRepository.listByOrdemProducaoIds([ordem.id]),
        ]);

        await notifyEtapaProductionAfterLoteSave({
          stage: 'fermentacao',
          ordem,
          produtoNome: produto?.nome || 'Produto não informado',
          lotes: lotesByOrdem.get(ordem.id) ?? [],
        });
      }
    } catch {
      // notificação opcional
    }

    revalidatePath('/api/painel/fermentacao');

    return NextResponse.json({ message: 'Lote atualizado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ loteId: string }> },
) {
  try {
    const { loteId } = await context.params;
    if (!loteId?.trim()) {
      return NextResponse.json({ error: 'ID do lote inválido' }, { status: 400 });
    }

    await fermentacaoLoteService.excluirLote(loteId);

    revalidatePath('/api/painel/fermentacao');

    return NextResponse.json({ message: 'Lote excluído com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
