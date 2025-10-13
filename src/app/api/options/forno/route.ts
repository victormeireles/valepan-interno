import { NextResponse } from 'next/server';
import { getColumnOptions, getProductsWithUnits } from '@/lib/googleSheets';
import { PEDIDOS_FORNO_CONFIG } from '@/config/forno';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'produtos'

  try {
    if (type === 'produtos') {
      const { spreadsheetId, tabName, productColumn, unitColumn, headerRow } = PEDIDOS_FORNO_CONFIG.origemProdutos;
      const options = await getColumnOptions(spreadsheetId, tabName, productColumn, headerRow);
      const productsWithUnits = await getProductsWithUnits(spreadsheetId, tabName, productColumn, unitColumn, headerRow);
      return NextResponse.json({ options, productsWithUnits });
    }

    return NextResponse.json({ error: 'Parâmetro type inválido' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


