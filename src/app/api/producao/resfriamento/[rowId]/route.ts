import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_RESFRIAMENTO_CONFIG } from '@/config/resfriamento';

export async function GET(request: Request, context: { params: Promise<{ rowId: string }> }) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);

    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_RESFRIAMENTO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    const range = `${tabName}!C${rowNumber}:AB${rowNumber}`; // Read from C to AB
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const values = response.data.values?.[0] || [];
    
    const data = {
      // Pedido original (colunas C, D, E)
      pedidoLatas: Number(values[0] || 0),    // C
      pedidoUnidades: Number(values[1] || 0), // D
      pedidoKg: Number(values[2] || 0),       // E
      // Produção (colunas V, W, X)
      latas: Number(values[19] || 0),          // V (skips F-U)
      unidades: Number(values[20] || 0),       // W
      kg: Number(values[21] || 0),             // X
      producaoUpdatedAt: values[22] || '',     // Y
      // Foto (colunas Z, AA, AB)
      resfriamentoFotoUrl: values[23] || '',    // Z
      resfriamentoFotoId: values[24] || '',     // AA
      resfriamentoFotoUploadedAt: values[25] || '', // AB
    };

    return NextResponse.json({ data, rowId: rowNumber });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ rowId: string }> }) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);

    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { latas, unidades, kg } = body;

    // Validações básicas
    if (latas < 0 || unidades < 0 || kg < 0) {
      return NextResponse.json({ error: 'Quantidades não podem ser negativas' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_RESFRIAMENTO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    const range = `${tabName}!V${rowNumber}:Y${rowNumber}`; // Update V-Y
    const values = [
      latas || 0,
      unidades || 0,
      kg || 0,
      new Date().toISOString(), // producao_updated_at
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values]
      }
    });

    revalidatePath('/api/painel/resfriamento');

    return NextResponse.json({ message: 'Produção de resfriamento atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

