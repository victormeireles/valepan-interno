import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { readSheetValues, calculateLoteFromDataFabricacao, updateCell } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';

function normalizeToISODate(value: unknown): string {
  if (value == null) return '';
  const str = value.toString().trim();
  // ISO já formatado
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // Formato brasileiro dd/mm/aaaa
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  // Tentar parsear datas como string completa
  const dt = new Date(str);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return '';
}

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

    // Buscar dados da linha específica
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const range = `${tabName}!A${rowNumber}:L${rowNumber}`;
    const rows = await readSheetValues(spreadsheetId, range);
    
    if (!rows || rows.length === 0 || !rows[0]) {
      return NextResponse.json({ error: 'Linha não encontrada' }, { status: 404 });
    }

    const row = rows[0];
    const data = {
      dataPedido: normalizeToISODate(row[0]),
      dataFabricacao: normalizeToISODate(row[1]),
      cliente: (row[2] || '').toString().trim(),
      observacao: (row[3] || '').toString().trim(),
      produto: (row[4] || '').toString().trim(),
      congelado: (row[5] || '').toString().trim() === 'Sim',
      caixas: Number(row[6] || 0),
      pacotes: Number(row[7] || 0),
      unidades: Number(row[8] || 0),
      kg: Number(row[9] || 0),
      createdAt: row[10] || '',
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
    const { dataPedido, dataFabricacao, cliente, observacao, produto, congelado, caixas, pacotes, unidades, kg } = body;

    // Normalizar datas para o formato correto
    const normalizedDataPedido = normalizeToISODate(dataPedido);
    const normalizedDataFabricacao = normalizeToISODate(dataFabricacao);

    // Validar dados obrigatórios
    if (!normalizedDataPedido || !normalizedDataFabricacao || !cliente || !produto) {
      return NextResponse.json({ error: 'Dados obrigatórios não fornecidos' }, { status: 400 });
    }

    // Buscar dados originais (created_at, data de fabricação e lote) antes de atualizar
    const { getGoogleSheetsClient } = await import('@/lib/googleSheets');
    const sheets = await getGoogleSheetsClient();
    
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    
    // Ler linha original incluindo todas as colunas necessárias (A-AB)
    const originalRange = `${tabName}!A${rowNumber}:AB${rowNumber}`;
    const originalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: originalRange,
    });
    
    // Extrair valores originais
    const originalValues = originalResponse.data.values?.[0] || [];
    const originalDataFabricacao = originalValues[1] ? normalizeToISODate(originalValues[1]) : ''; // Coluna B (índice 1)
    const originalCreatedAt = originalValues[10] || new Date().toISOString(); // Coluna K (índice 10)

    // Atualizar a linha no Google Sheets
    const range = `${tabName}!A${rowNumber}:L${rowNumber}`;
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
      originalCreatedAt, // created_at (manter valor original)
      new Date().toISOString(), // updated_at (atualizar)
    ];

    // Usar a API do Google Sheets para atualizar a linha
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED', // Mesmo que na criação para interpretar datas corretamente
      requestBody: {
        values: [values]
      }
    });

    // Se a data de fabricação mudou, recalcular e atualizar o lote
    if (originalDataFabricacao !== normalizedDataFabricacao) {
      const novoLote = calculateLoteFromDataFabricacao(normalizedDataFabricacao);
      await updateCell(spreadsheetId, tabName, rowNumber, 'AA', novoLote);
    }

    revalidatePath('/api/painel/embalagem');

    return NextResponse.json({ message: 'Linha atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
