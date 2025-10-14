import { NextResponse } from 'next/server';
import { appendRow } from '@/lib/googleSheets';
import { PEDIDOS_FORNO_CONFIG, PedidoFornoPayload } from '@/config/forno';

function isValidDateISO(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PedidoFornoPayload;

    if (!payload || !isValidDateISO(payload.dataProducao)) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }
    if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
      return NextResponse.json({ error: 'Inclua ao menos um item' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const now = new Date().toISOString();

    for (const item of payload.itens) {
      if (!item.produto) continue;
      const values = [
        payload.dataProducao, // A
        item.produto,         // B
        item.latas || 0,      // C
        item.unidades || 0,   // D
        item.kg || 0,         // E
        now,                  // F created_at
        now,                  // G updated_at
      ];
      await appendRow(spreadsheetId, tabName, values);
    }

    return NextResponse.json({ message: 'Pedido de produção salvo com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


