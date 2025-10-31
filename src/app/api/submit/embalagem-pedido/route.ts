import { NextResponse } from 'next/server';
import { appendRow, getLastLote } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG, PedidoEmbalagemPayload } from '@/config/embalagem';

function isValidDateISO(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PedidoEmbalagemPayload;

    if (!payload || !isValidDateISO(payload.dataPedido) || !isValidDateISO(payload.dataFabricacao)) {
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
    }
    if (!payload.cliente) {
      return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 });
    }
    if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
      return NextResponse.json({ error: 'Inclua ao menos um item' }, { status: 400 });
    }

    // Buscar o último lote e incrementar
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const lastLote = await getLastLote(spreadsheetId, tabName, 'M'); // Coluna M = Lote
    const newLote = lastLote + 1;

    // Persistir cada item como linha separada (regra 4: manter histórico)
    const now = new Date().toISOString();
    
    for (const item of payload.itens) {
      const values = [
        payload.dataPedido,
        payload.dataFabricacao,
        payload.cliente,
        payload.observacao || '',
        item.produto,
        item.congelado,
        item.caixas || 0,
        item.pacotes || 0,
        item.unidades || 0,
        item.kg || 0,
        now, // created_at
        now, // updated_at (mesmo valor na criação)
        newLote, // Lote (coluna M)
        '', // Etiqueta Gerada (coluna N) - inicialmente vazio
      ];
      await appendRow(spreadsheetId, tabName, values);
    }

    return NextResponse.json({ message: 'Pedido salvo com sucesso', lote: newLote });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


