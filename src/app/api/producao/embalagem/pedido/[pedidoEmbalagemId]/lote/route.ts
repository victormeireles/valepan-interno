import { NextResponse } from 'next/server';

import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import {
  embalagemLoteService,
  EstoqueResolverError,
} from '@/lib/services/embalagem-lote-service';
import { estoqueService } from '@/lib/services/estoque-service';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ pedidoEmbalagemId: string }> },
) {
  try {
    const { pedidoEmbalagemId } = await context.params;
    const body = await request.json();
    const {
      caixas,
      pacotes,
      unidades,
      kg,
      obsEmbalagem,
      pacoteFotoUrl,
      pacoteFotoId,
      pacoteFotoUploadedAt,
      etiquetaFotoUrl,
      etiquetaFotoId,
      etiquetaFotoUploadedAt,
      palletFotoUrl,
      palletFotoId,
      palletFotoUploadedAt,
    } = body;

    const c = Number(caixas) || 0;
    const p = Number(pacotes) || 0;
    const u = Number(unidades) || 0;
    const k = Number(kg) || 0;

    if (c < 0 || p < 0 || u < 0 || k < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }
    if (c + p + u + k <= 0) {
      return NextResponse.json(
        { error: 'Informe ao menos uma quantidade maior que zero (cx, pct, un ou kg).' },
        { status: 400 },
      );
    }

    const pedido = await pedidoEmbalagemRepository.findById(pedidoEmbalagemId);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const productService = new SupabaseProductService();
    const [produto, tipo] = await Promise.all([
      productService.findById(pedido.produtoId),
      tiposEstoqueService.findById(pedido.tipoEstoqueId),
    ]);

    if (!produto || !tipo) {
      return NextResponse.json({ error: 'Cliente ou produto não encontrado' }, { status: 400 });
    }

    let loteId: string | undefined;
    try {
      const loteRecord = await embalagemLoteService.criarLotePorPedidoEmbalagem({
        pedidoEmbalagemId,
        clienteNome: tipo.nome,
        produtoNome: produto.nome,
        quantidade: { caixas: c, pacotes: p, unidades: u, kg: k },
        obsEmbalagem: obsEmbalagem || '',
        fotos: {
          pacoteFotoUrl: pacoteFotoUrl || undefined,
          pacoteFotoId: pacoteFotoId || undefined,
          pacoteFotoUploadedAt: pacoteFotoUploadedAt || undefined,
          etiquetaFotoUrl: etiquetaFotoUrl || undefined,
          etiquetaFotoId: etiquetaFotoId || undefined,
          etiquetaFotoUploadedAt: etiquetaFotoUploadedAt || undefined,
          palletFotoUrl: palletFotoUrl || undefined,
          palletFotoId: palletFotoId || undefined,
          palletFotoUploadedAt: palletFotoUploadedAt || undefined,
        },
      });
      loteId = loteRecord.id;

      const clienteEstoque = (await estoqueService.obterTipoEstoqueCliente(tipo.nome)) ?? tipo.nome;
      await estoqueService.aplicarDelta({
        cliente: clienteEstoque,
        produto: produto.nome,
        delta: { caixas: c, pacotes: p, unidades: u, kg: k },
        origem: 'embalagem',
        embalagemLoteId: loteId,
      });

      try {
        await whatsAppNotificationService.notifyEmbalagemProduction({
          produto: produto.nome,
          cliente: tipo.nome,
          quantidadeEmbalada: { caixas: c, pacotes: p, unidades: u, kg: k },
          metaOriginal: {
            caixas: pedido.quantidade.caixas,
            pacotes: pedido.quantidade.pacotes,
            unidades: pedido.quantidade.unidades,
            kg: pedido.quantidade.kg,
          },
          isPartial: c < pedido.quantidade.caixas || p < pedido.quantidade.pacotes,
          fotos: {
            pacoteFotoUrl: pacoteFotoUrl || undefined,
            etiquetaFotoUrl: etiquetaFotoUrl || undefined,
            palletFotoUrl: palletFotoUrl || undefined,
          },
          obsEmbalagem: obsEmbalagem || undefined,
        });
      } catch {
        // notificação opcional
      }

      return NextResponse.json({
        message: 'Lote criado com sucesso',
        loteId: loteRecord.id,
      });
    } catch (dbError) {
      if (loteId) {
        await embalagemLoteService.compensarLote(loteId).catch(() => undefined);
      }
      if (dbError instanceof EstoqueResolverError) {
        return NextResponse.json({ error: dbError.message }, { status: 400 });
      }
      throw dbError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
