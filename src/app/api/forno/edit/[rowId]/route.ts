import { NextResponse } from 'next/server';
import { readSheetValues, getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_FORNO_CONFIG } from '@/config/forno';

function normalizeToISODate(value: unknown): string {
  if (value == null) return '';
  const str = value.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
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

    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const range = `${tabName}!A${rowNumber}:AC${rowNumber}`;
    const rows = await readSheetValues(spreadsheetId, range);
    if (!rows || rows.length === 0 || !rows[0]) {
      return NextResponse.json({ error: 'Linha não encontrada' }, { status: 404 });
    }

    const row = rows[0];
    const data = {
      dataProducao: normalizeToISODate(row[0]),
      produto: (row[1] || '').toString().trim(),
      latas: Number(row[2] || 0),
      unidades: Number(row[3] || 0),
      kg: Number(row[4] || 0),
      createdAt: row[5] || '',
      observacao: (row[28] || '').toString().trim() || undefined, // AC
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
    const { dataProducao, produto, latas, unidades, kg, observacao } = body;

    const normalizedData = normalizeToISODate(dataProducao);
    if (!normalizedData || !produto) {
      return NextResponse.json({ error: 'Dados obrigatórios não fornecidos' }, { status: 400 });
    }

    const sheets = await getGoogleSheetsClient();
    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;

    // Buscar created_at original
    const originalRange = `${tabName}!F${rowNumber}`;
    const originalResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: originalRange });
    const originalCreatedAt = originalResponse.data.values?.[0]?.[0] || new Date().toISOString();

    // Atualizar colunas A-G e AC (observação)
    const rangeAtoG = `${tabName}!A${rowNumber}:G${rowNumber}`;
    const valuesAtoG = [
      normalizedData,  // A
      produto,         // B
      latas || 0,      // C
      unidades || 0,    // D
      kg || 0,         // E
      originalCreatedAt, // F
      new Date().toISOString(), // G updated_at
    ];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangeAtoG,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [valuesAtoG] }
    });

    // Atualizar observação na coluna AC
    const rangeAC = `${tabName}!AC${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangeAC,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[observacao || '']] }
    });

    return NextResponse.json({ message: 'Linha atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


