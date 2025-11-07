import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';

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
    
    // Buscar colunas G, H, I, J (pedido), M, N, O, P, Q (produção) e R, S, T, U, V, W, X, Y, Z (fotos)
    const range = `${tabName}!G${rowNumber}:Z${rowNumber}`;
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
      // Dados de fotos (colunas R, S, T, U, V, W, X, Y, Z)
      pacoteFotoUrl: values[11] || '',         // R
      pacoteFotoId: values[12] || '',          // S
      pacoteFotoUploadedAt: values[13] || '',  // T
      etiquetaFotoUrl: values[14] || '',       // U
      etiquetaFotoId: values[15] || '',        // V
      etiquetaFotoUploadedAt: values[16] || '', // W
      palletFotoUrl: values[17] || '',         // X
      palletFotoId: values[18] || '',          // Y
      palletFotoUploadedAt: values[19] || '',  // Z
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

    // Atualizar apenas colunas de produção (M, N, O, P, Q)
    // Não tocar nas colunas de foto (R-Z) que são gerenciadas pela API de upload
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    
    // Buscar dados completos da linha antes de atualizar (para notificação)
    // Buscar colunas A-J (dados básicos) e R-Z (fotos)
    const rangeComplete = `${tabName}!A${rowNumber}:Z${rowNumber}`;
    const responseComplete = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: rangeComplete,
    });
    
    const completeValues = responseComplete.data.values?.[0] || [];
    const cliente = completeValues[2] || '';             // C
    const produto = completeValues[4] || '';             // E
    const pedidoCaixas = Number(completeValues[6] || 0);    // G
    const pedidoPacotes = Number(completeValues[7] || 0);   // H
    const pedidoUnidades = Number(completeValues[8] || 0);  // I
    const pedidoKg = Number(completeValues[9] || 0);        // J
    
    // Dados de fotos (colunas R, U, X)
    const pacoteFotoUrl = completeValues[17] || '';         // R
    const etiquetaFotoUrl = completeValues[20] || '';       // U
    const palletFotoUrl = completeValues[23] || '';         // X
    
    const range = `${tabName}!M${rowNumber}:Q${rowNumber}`;
    const values = [
      caixas || 0,                    // M - caixas
      pacotes || 0,                   // N - pacotes
      unidades || 0,                  // O - unidades
      kg || 0,                        // P - kg
      new Date().toISOString(),       // Q - producao_updated_at
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values]
      }
    });

    try {
      await whatsAppNotificationService.notifyEmbalagemProduction({
        produto,
        cliente,
        quantidadeEmbalada: {
          caixas: caixas || 0,
          pacotes: pacotes || 0,
          unidades: unidades || 0,
          kg: kg || 0,
        },
        metaOriginal: {
          caixas: pedidoCaixas,
          pacotes: pedidoPacotes,
          unidades: pedidoUnidades,
          kg: pedidoKg,
        },
        isPartial: false,
        fotos: {
          pacoteFotoUrl: pacoteFotoUrl || undefined,
          etiquetaFotoUrl: etiquetaFotoUrl || undefined,
          palletFotoUrl: palletFotoUrl || undefined,
        } as { pacoteFotoUrl?: string; etiquetaFotoUrl?: string; palletFotoUrl?: string },
      });
    } catch (error) {
      // Logar erro mas não propagar
      console.error("Erro ao enviar notificação WhatsApp:", error);
    }

    return NextResponse.json({ message: 'Produção atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
