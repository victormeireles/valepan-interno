import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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
      // Criar array com 29 elementos (A até AC), preenchendo com valores vazios onde necessário
      const values: (string | number)[] = new Array(29).fill('');
      values[0] = payload.dataProducao;  // A
      values[1] = item.produto;          // B
      values[2] = item.latas || 0;       // C
      values[3] = item.unidades || 0;    // D
      values[4] = item.kg || 0;           // E
      values[5] = now;                    // F created_at
      values[6] = now;                    // G updated_at
      values[28] = item.observacao || ''; // AC observação
      await appendRow(spreadsheetId, tabName, values);
    }

    revalidatePath('/api/painel/forno');

    return NextResponse.json({ message: 'Pedido de produção salvo com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


