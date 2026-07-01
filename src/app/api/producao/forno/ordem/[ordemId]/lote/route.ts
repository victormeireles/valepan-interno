import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import { fornoLoteService } from '@/lib/services/forno-lote-service';
import { notifyEtapaProductionAfterLoteSave } from '@/lib/services/etapa-production-notification';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ ordemId: string }> },
) {
  try {
    const { ordemId } = await context.params;
    if (!ordemId?.trim()) {
      return NextResponse.json({ error: 'ID da ordem inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { assadeiras, unidades, fotoUrl, fotoId, fotoUploadedAt, continuaProduzindo } = body;

    const loteAssadeiras = Number(assadeiras) || 0;
    const loteUnidades = Number(unidades) || 0;

    if (loteAssadeiras < 0 || loteUnidades < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    const ordem = await ordemProducaoRepository.findById(ordemId);
    if (!ordem) {
      return NextResponse.json({ error: 'Ordem de produção não encontrada' }, { status: 404 });
    }

    const { lote, insumoConsumo } = await fornoLoteService.criarLotePorOrdem({
      ordemProducaoId: ordemId,
      quantidade: { assadeiras: loteAssadeiras, unidades: loteUnidades },
      fotos: {
        fotoUrl: fotoUrl || undefined,
        fotoId: fotoId || undefined,
        fotoUploadedAt: fotoUploadedAt || undefined,
      },
      continuaProduzindo: continuaProduzindo ?? true,
    });

    try {
      const [produto, lotesByOrdem] = await Promise.all([
        new SupabaseProductService().findById(ordem.produtoId),
        fornoLoteRepository.listByOrdemProducaoIds([ordem.id]),
      ]);

      await notifyEtapaProductionAfterLoteSave({
        stage: 'forno',
        ordem,
        produtoNome: produto?.nome || 'Produto não informado',
        lotes: lotesByOrdem.get(ordem.id) ?? [],
      });
    } catch {
      // notificação opcional
    }

    revalidatePath('/api/painel/forno');

    return NextResponse.json({
      message: 'Lote criado com sucesso',
      loteId: lote.id,
      insumoConsumo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

