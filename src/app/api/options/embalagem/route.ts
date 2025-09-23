import { NextResponse } from 'next/server';
import { getColumnOptions, getProductsWithUnits } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'clientes' | 'produtos'

  try {
    if (type === 'clientes') {
      const { spreadsheetId, tabName, column, headerRow } = PEDIDOS_EMBALAGEM_CONFIG.origemClientes;
      const options = await getColumnOptions(spreadsheetId, tabName, column, headerRow);
      return NextResponse.json({ options });
    }

    if (type === 'produtos') {
      const { spreadsheetId, tabName, productColumn, unitColumn, headerRow } = PEDIDOS_EMBALAGEM_CONFIG.origemProdutos;
      
      // Buscar lista de produtos usando a mesma lógica das outras telas
      const options = await getColumnOptions(spreadsheetId, tabName, productColumn, headerRow);
      
      // Buscar produtos com unidades para funcionalidade adicional
      const productsWithUnits = await getProductsWithUnits(spreadsheetId, tabName, productColumn, unitColumn, headerRow);
      
      return NextResponse.json({ 
        options,
        productsWithUnits 
      });
    }

    return NextResponse.json({ error: 'Parâmetro type inválido' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


