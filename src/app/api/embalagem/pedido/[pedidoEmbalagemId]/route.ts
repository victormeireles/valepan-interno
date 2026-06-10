import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import {
  ordemProducaoMetaService,
  EstoqueResolverError,
} from '@/lib/services/ordem-producao-meta-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

function normalizeToISODate(value: unknown): string {
  if (value == null) return '';
  const str = value.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  const dt = new Date(str);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return '';
}

async function loadPedidoOr404(pedidoEmbalagemId: string) {
  const pedido = await pedidoEmbalagemRepository.findById(pedidoEmbalagemId);
  if (!pedido) return null;
  return pedido;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ pedidoEmbalagemId: string }> },
) {
  try {
    const { pedidoEmbalagemId } = await context.params;
    const pedido = await loadPedidoOr404(pedidoEmbalagemId);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const [tipo, produto] = await Promise.all([
      tiposEstoqueService.findById(pedido.tipoEstoqueId),
      new SupabaseProductService().findById(pedido.produtoId),
    ]);

    return NextResponse.json({
      pedidoEmbalagemId: pedido.id,
      data: {
        dataPedido: pedido.dataProducao,
        dataFabricacao: pedido.dataFabricacaoEtiqueta,
        cliente: tipo?.nome ?? '',
        observacao: pedido.observacao,
        produto: produto?.nome ?? '',
        congelado: tipo?.congelado ?? false,
        caixas: pedido.quantidade.caixas,
        pacotes: pedido.quantidade.pacotes,
        unidades: pedido.quantidade.unidades,
        kg: pedido.quantidade.kg,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ pedidoEmbalagemId: string }> },
) {
  try {
    const { pedidoEmbalagemId } = await context.params;
    const pedido = await loadPedidoOr404(pedidoEmbalagemId);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      dataPedido,
      dataFabricacao,
      cliente,
      observacao,
      produto,
      caixas,
      pacotes,
      unidades,
      kg,
    } = body;

    const normalizedDataPedido = normalizeToISODate(dataPedido);
    const normalizedDataFabricacao = normalizeToISODate(dataFabricacao);

    if (!normalizedDataPedido || !normalizedDataFabricacao || !cliente || !produto) {
      return NextResponse.json({ error: 'Dados obrigatórios não fornecidos' }, { status: 400 });
    }

    try {
      await ordemProducaoMetaService.updateFields(pedidoEmbalagemId, {
        dataProducao: normalizedDataPedido,
        dataEtiqueta: normalizedDataFabricacao,
        tipoEstoque: cliente,
        produto,
        observacao: observacao || '',
        quantidade: {
          caixas: caixas || 0,
          pacotes: pacotes || 0,
          unidades: unidades || 0,
          kg: kg || 0,
        },
      });
    } catch (e) {
      if (e instanceof EstoqueResolverError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      const message = e instanceof Error ? e.message : 'Erro ao atualizar pedido';
      const status = message.includes('produzido') ? 400 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    revalidatePath('/api/painel/embalagem');
    return NextResponse.json({ message: 'Pedido atualizado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ pedidoEmbalagemId: string }> },
) {
  try {
    const { pedidoEmbalagemId } = await context.params;
    const pedido = await loadPedidoOr404(pedidoEmbalagemId);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    try {
      await ordemProducaoMetaService.delete(pedidoEmbalagemId);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao excluir pedido';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    revalidatePath('/api/painel/embalagem');
    return NextResponse.json({ message: 'Pedido deletado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
