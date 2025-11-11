import { NextResponse } from 'next/server';
import { getColumnOptions, getProductsWithUnits } from '@/lib/googleSheets';
import { SAIDAS_SHEET_CONFIG } from '@/config/saidas';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'clientes') {
      const { spreadsheetId, tabName, column, headerRow } =
        SAIDAS_SHEET_CONFIG.origemClientes;
      const options = await getColumnOptions(
        spreadsheetId,
        tabName,
        column,
        headerRow,
      );
      return NextResponse.json({ options });
    }

    if (type === 'produtos') {
      const { spreadsheetId, tabName, productColumn, unitColumn, headerRow } =
        SAIDAS_SHEET_CONFIG.origemProdutos;
      const options = await getColumnOptions(
        spreadsheetId,
        tabName,
        productColumn,
        headerRow,
      );
      const productsWithUnits = await getProductsWithUnits(
        spreadsheetId,
        tabName,
        productColumn,
        unitColumn,
        headerRow,
      );
      return NextResponse.json({ options, productsWithUnits });
    }

    return NextResponse.json(
      { error: 'Parâmetro type inválido' },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


