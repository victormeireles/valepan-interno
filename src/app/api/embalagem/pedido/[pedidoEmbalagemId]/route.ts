import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { calculateLoteFromDataFabricacao, getGoogleSheetsClient, updateCell } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import {
  deleteAllSheetRowsForPedido,
  findSheetRowsForPedidoKey,
  pedidoRecordToKey,
} from '@/domain/embalagem/pedido-sheet-ops';
import {
  pedidoEmbalagemService,
  EstoqueResolverError,
} from '@/lib/services/pedido-embalagem-service';
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
        congelado: false,
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
      congelado,
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
      await pedidoEmbalagemService.resolveIds(cliente, produto);
    } catch (e) {
      if (e instanceof EstoqueResolverError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    const originalDataPedido = pedido.dataProducao;
    const key = pedidoRecordToKey(pedido);
    const matches = await findSheetRowsForPedidoKey(key, (c, p) =>
      pedidoEmbalagemService.resolveIds(c, p),
    {
      dataProducaoFilter: pedido.dataProducao,
      dataFabricacaoEtiqueta: pedido.dataFabricacaoEtiqueta,
      observacao: pedido.observacao,
      produtoNome: produto,
    },
    );

    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();

    if (matches.length > 0) {
      const first = matches[0];
      const originalRange = `${tabName}!A${first.rowNumber}:AB${first.rowNumber}`;
      const originalResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: originalRange,
      });
      const originalValues = originalResponse.data.values?.[0] || [];
      const originalCreatedAt = originalValues[10] || new Date().toISOString();
      const originalDataFabricacao = originalValues[1]
        ? normalizeToISODate(originalValues[1])
        : '';

      const range = `${tabName}!A${first.rowNumber}:L${first.rowNumber}`;
      const values = [
        normalizedDataPedido,
        normalizedDataFabricacao,
        cliente,
        observacao || '',
        produto,
        congelado ? 'Sim' : 'Não',
        caixas || 0,
        pacotes || 0,
        unidades || 0,
        kg || 0,
        originalCreatedAt,
        new Date().toISOString(),
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values] },
      });

      if (originalDataFabricacao !== normalizedDataFabricacao) {
        const novoLote = calculateLoteFromDataFabricacao(normalizedDataFabricacao);
        await updateCell(spreadsheetId, tabName, first.rowNumber, 'AA', novoLote);
      }

      const extraRows = matches.slice(1).map((m) => m.rowNumber).sort((a, b) => b - a);
      const { deleteSheetRow } = await import('@/lib/googleSheets');
      for (const rowNumber of extraRows) {
        await deleteSheetRow(spreadsheetId, tabName, rowNumber);
      }
    }

    try {
      await pedidoEmbalagemService.reconcileForDate(normalizedDataPedido);
      if (originalDataPedido && originalDataPedido !== normalizedDataPedido) {
        await pedidoEmbalagemService.reconcileForDate(originalDataPedido);
      }
    } catch (reconcileError) {
      const message =
        reconcileError instanceof Error
          ? reconcileError.message
          : 'Erro ao sincronizar pedido no banco';
      return NextResponse.json({ error: message }, { status: 500 });
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

    const produzido = await embalagemLoteRepository.sumQuantidadeByPedidoId(pedido.id);
    const totalProduzido =
      produzido.caixas + produzido.pacotes + produzido.unidades + produzido.kg;
    if (totalProduzido > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir pedido com produção registrada' },
        { status: 400 },
      );
    }

    const dataProducao = pedido.dataProducao;
    await deleteAllSheetRowsForPedido(pedido, (c, p) =>
      pedidoEmbalagemService.resolveIds(c, p),
    );

    try {
      await pedidoEmbalagemService.reconcileForDate(dataProducao);
    } catch (reconcileError) {
      const message =
        reconcileError instanceof Error
          ? reconcileError.message
          : 'Erro ao sincronizar pedido no banco';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    revalidatePath('/api/painel/embalagem');
    return NextResponse.json({ message: 'Pedido deletado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
