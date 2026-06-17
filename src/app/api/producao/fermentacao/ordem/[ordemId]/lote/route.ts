import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import { fermentacaoLoteService } from '@/lib/services/fermentacao-lote-service';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';

function formatDateTimeToBr(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function deriveProducedKg(
  meta: { assadeiras: number; unidades: number; kg: number },
  produzido: { assadeiras: number; unidades: number },
): number {
  if (meta.kg <= 0) return 0;
  if (meta.assadeiras > 0) {
    return Number(((produzido.assadeiras / meta.assadeiras) * meta.kg).toFixed(2));
  }
  if (meta.unidades > 0) {
    return Number(((produzido.unidades / meta.unidades) * meta.kg).toFixed(2));
  }
  return 0;
}

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
    const { assadeiras, unidades, fotoUrl, fotoId, fotoUploadedAt } = body;

    const loteAssadeiras = Number(assadeiras) || 0;
    const loteUnidades = Number(unidades) || 0;

    if (loteAssadeiras < 0 || loteUnidades < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    const ordem = await ordemProducaoRepository.findById(ordemId);
    if (!ordem) {
      return NextResponse.json({ error: 'Ordem de produção não encontrada' }, { status: 404 });
    }

    const lote = await fermentacaoLoteService.criarLotePorOrdem({
      ordemProducaoId: ordemId,
      quantidade: { assadeiras: loteAssadeiras, unidades: loteUnidades },
      fotos: {
        fotoUrl: fotoUrl || undefined,
        fotoId: fotoId || undefined,
        fotoUploadedAt: fotoUploadedAt || undefined,
      },
    });

    try {
      const [produto, lotesByOrdem] = await Promise.all([
        new SupabaseProductService().findById(ordem.produtoId),
        fermentacaoLoteRepository.listByOrdemProducaoIds([ordem.id]),
      ]);
      const lotes = lotesByOrdem.get(ordem.id) ?? [];
      const produzido = lotes.reduce(
        (acc, item) => ({
          assadeiras: acc.assadeiras + Number(item.assadeiras || 0),
          unidades: acc.unidades + Number(item.unidades || 0),
        }),
        { assadeiras: 0, unidades: 0 },
      );

      await whatsAppNotificationService.notifyFermentacaoProduction({
        produto: produto?.nome || 'Produto não informado',
        meta: {
          latas: ordem.assadeiras,
          unidades: ordem.quantidade.unidades,
          kg: ordem.quantidade.kg,
        },
        produzido: {
          latas: produzido.assadeiras,
          unidades: produzido.unidades,
          kg: deriveProducedKg(
            {
              assadeiras: ordem.assadeiras,
              unidades: ordem.quantidade.unidades,
              kg: ordem.quantidade.kg,
            },
            produzido,
          ),
        },
        data: ordem.dataProducao,
        atualizadoEm: formatDateTimeToBr(new Date()),
      });
    } catch {
      // notificação opcional
    }

    revalidatePath('/api/painel/fermentacao');

    return NextResponse.json({
      message: 'Lote criado com sucesso',
      loteId: lote.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
