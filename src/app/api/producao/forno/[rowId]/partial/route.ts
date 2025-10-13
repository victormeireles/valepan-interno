import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_FORNO_CONFIG } from '@/config/forno';

export async function POST(
  request: Request,
  context: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { latas, unidades, kg, fornoFotoUrl, fornoFotoId, fornoFotoUploadedAt } = body;
    if (latas < 0 || unidades < 0 || kg < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();

    // 1) Ler linha original A:N
    const rangeOriginal = `${tabName}!A${rowNumber}:N${rowNumber}`;
    const responseOriginal = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeOriginal });
    const r = responseOriginal.data.values?.[0] || [];
    if (r.length === 0) {
      return NextResponse.json({ error: 'Pedido original não encontrado' }, { status: 404 });
    }

    const dataProducao = r[0] || '';
    const produto = r[1] || '';
    const pedidoLatas = Number(r[2] || 0);
    const pedidoUnidades = Number(r[3] || 0);
    const pedidoKg = Number(r[4] || 0);

    // 2) Validar produção parcial
    const isPartial = (
      (pedidoLatas > 0 && latas < pedidoLatas) ||
      (pedidoUnidades > 0 && unidades < pedidoUnidades) ||
      (pedidoKg > 0 && kg < pedidoKg)
    );
    if (!isPartial) {
      return NextResponse.json({ error: 'Produção não é parcial. Use o salvar normal.' }, { status: 400 });
    }

    // 3) Atualizar pedido na linha original (C-E)
    const novoPedidoLatas = Math.max(0, pedidoLatas - (latas || 0));
    const novoPedidoUnidades = Math.max(0, pedidoUnidades - (unidades || 0));
    const novoPedidoKg = Math.max(0, pedidoKg - (kg || 0));

    const rangePedido = `${tabName}!C${rowNumber}:E${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangePedido,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[novoPedidoLatas, novoPedidoUnidades, novoPedidoKg]] }
    });

    // 4) Criar nova linha com pedido=produzido e produção=produzido, timestamps e foto
    const now = new Date().toISOString();
    const novaLinhaValues = [
      dataProducao,     // A
      produto,          // B
      latas || 0,       // C pedido
      unidades || 0,    // D pedido
      kg || 0,          // E pedido
      now,              // F created_at
      now,              // G updated_at
      latas || 0,       // H produção
      unidades || 0,    // I produção
      kg || 0,          // J produção
      now,              // K producao_updated_at
      fornoFotoUrl || '', // L
      fornoFotoId || '',  // M
      fornoFotoUploadedAt || '', // N
    ];

    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [novaLinhaValues] }
    });

    const updatedRange = appendResponse.data.updates?.updatedRange || '';
    const match = updatedRange.match(/!A(\d+):/);
    const novaLinhaRowId = match ? parseInt(match[1]) : null;

    return NextResponse.json({
      message: 'Produção parcial salva com sucesso',
      novaLinhaRowId,
      linhaOriginal: {
        novoPedido: { latas: novoPedidoLatas, unidades: novoPedidoUnidades, kg: novoPedidoKg }
      },
      novaLinha: {
        pedido: { latas, unidades, kg },
        producao: { latas, unidades, kg }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


