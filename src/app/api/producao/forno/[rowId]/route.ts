import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_FORNO_CONFIG } from '@/config/forno';

export async function GET(
  request: Request,
  context: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    // C-E (pedido), H-K (produção + updated_at), L-N (foto)
    const range = `${tabName}!C${rowNumber}:N${rowNumber}`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const values = response.data.values?.[0] || [];

    const data = {
      // Pedido
      pedidoLatas: Number(values[0] || 0),     // C
      pedidoUnidades: Number(values[1] || 0),  // D
      pedidoKg: Number(values[2] || 0),        // E
      // Produção
      latas: Number(values[4] || 0),           // H (pula F,G)
      unidades: Number(values[5] || 0),        // I
      kg: Number(values[6] || 0),              // J
      producaoUpdatedAt: values[7] || '',      // K
      // Foto
      fornoFotoUrl: values[8] || '',           // L
      fornoFotoId: values[9] || '',            // M
      fornoFotoUploadedAt: values[10] || '',   // N
    };

    return NextResponse.json({ data, rowId: rowNumber });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
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
    const { latas, unidades, kg } = body;
    if (latas < 0 || unidades < 0 || kg < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();

    const range = `${tabName}!H${rowNumber}:K${rowNumber}`;
    const values = [
      latas || 0,                 // H
      unidades || 0,              // I
      kg || 0,                    // J
      new Date().toISOString(),   // K
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] }
    });

    return NextResponse.json({ message: 'Produção de forno atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


