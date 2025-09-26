import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';

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

    // Buscar dados da linha específica (colunas do pedido + produção)
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    
    // Buscar colunas G, H, I, J (pedido) e M, N, O, P, Q (produção)
    const range = `${tabName}!G${rowNumber}:Q${rowNumber}`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values?.[0] || [];
    
    const data = {
      // Dados do pedido original (colunas G, H, I, J)
      pedidoCaixas: Number(values[0] || 0),    // G
      pedidoPacotes: Number(values[1] || 0),   // H
      pedidoUnidades: Number(values[2] || 0),  // I
      pedidoKg: Number(values[3] || 0),        // J
      // Dados de produção (colunas M, N, O, P)
      caixas: Number(values[6] || 0),          // M (pula K, L)
      pacotes: Number(values[7] || 0),         // N
      unidades: Number(values[8] || 0),        // O
      kg: Number(values[9] || 0),              // P
      producaoUpdatedAt: values[10] || '',     // Q
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
    const { caixas, pacotes, unidades, kg } = body;

    // Validar dados
    if (caixas < 0 || pacotes < 0 || unidades < 0 || kg < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    // Atualizar apenas as colunas de produção
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    
    const range = `${tabName}!M${rowNumber}:Q${rowNumber}`;
    const values = [
      caixas || 0,
      pacotes || 0,
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

    return NextResponse.json({ message: 'Produção atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
