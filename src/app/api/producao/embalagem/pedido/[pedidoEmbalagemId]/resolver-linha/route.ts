import { NextResponse } from 'next/server';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import { resolveLinhaComSaldoParaPedido } from '@/domain/embalagem/pedido-sheet-ops';
import { pedidoEmbalagemService } from '@/lib/services/pedido-embalagem-service';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';

export async function POST(
  _request: Request,
  context: { params: Promise<{ pedidoEmbalagemId: string }> },
) {
  const t0 = Date.now();
  try {
    const { pedidoEmbalagemId } = await context.params;
    const pedido = await pedidoEmbalagemRepository.findById(pedidoEmbalagemId);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const tDb = Date.now();
    const productService = new SupabaseProductService();
    const [produto, tipo] = await Promise.all([
      productService.findById(pedido.produtoId),
      tiposEstoqueService.findById(pedido.tipoEstoqueId),
    ]);
    const tSheet = Date.now();

    const planilhaRowId = await resolveLinhaComSaldoParaPedido(
      pedido,
      (c, p) => pedidoEmbalagemService.resolveIds(c, p),
      { produtoNome: produto?.nome, clienteNome: tipo?.nome },
    );
    const tEnd = Date.now();

    if (process.env.NODE_ENV === 'development') {
      console.info('[resolver-linha]', {
        pedidoEmbalagemId,
        dbMs: tSheet - tDb,
        sheetMs: tEnd - tSheet,
        totalMs: tEnd - t0,
        planilhaRowId,
      });
    }

    if (!planilhaRowId) {
      return NextResponse.json(
        { error: 'Nenhuma linha com saldo na planilha' },
        { status: 400 },
      );
    }

    return NextResponse.json({ planilhaRowId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
