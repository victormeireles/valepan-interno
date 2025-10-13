import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_FERMENTACAO_CONFIG } from '@/config/fermentacao';

export async function GET(request: Request, context: { params: Promise<{ rowId: string }> }) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);

    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    const range = `${tabName}!C${rowNumber}:U${rowNumber}`; // Read from C to U
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const values = response.data.values?.[0] || [];
    
    const data = {
      // Pedido original (colunas C, D, E)
      pedidoLatas: Number(values[0] || 0),    // C
      pedidoUnidades: Number(values[1] || 0), // D
      pedidoKg: Number(values[2] || 0),       // E
      // Produção (colunas O, P, Q)
      latas: Number(values[12] || 0),          // O (skips F-N)
      unidades: Number(values[13] || 0),       // P
      kg: Number(values[14] || 0),             // Q
      producaoUpdatedAt: values[15] || '',     // R
      // Foto (colunas S, T, U)
      fermentacaoFotoUrl: values[16] || '',    // S
      fermentacaoFotoId: values[17] || '',     // T
      fermentacaoFotoUploadedAt: values[18] || '', // U
    };

    return NextResponse.json({ data, rowId: rowNumber });
  } catch (error) {
    console.error('Erro ao carregar dados de produção de fermentação:', error);
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

    const { spreadsheetId, tabName } = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    const range = `${tabName}!O${rowNumber}:R${rowNumber}`; // Update O-R
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

    return NextResponse.json({ message: 'Produção de fermentação atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar produção de fermentação:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
