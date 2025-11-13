import { NextResponse } from 'next/server';
import { getColumnOptions, getProductsWithUnits } from '@/lib/googleSheets';
import { INVENTARIO_SHEET_CONFIG } from '@/config/inventario';

export async function GET() {
  try {
    const clientes = await getColumnOptions(
      INVENTARIO_SHEET_CONFIG.origemClientes.spreadsheetId,
      INVENTARIO_SHEET_CONFIG.origemClientes.tabName,
      INVENTARIO_SHEET_CONFIG.origemClientes.column,
      INVENTARIO_SHEET_CONFIG.origemClientes.headerRow,
    );

    const produtos = await getProductsWithUnits(
      INVENTARIO_SHEET_CONFIG.origemProdutos.spreadsheetId,
      INVENTARIO_SHEET_CONFIG.origemProdutos.tabName,
      INVENTARIO_SHEET_CONFIG.origemProdutos.productColumn,
      INVENTARIO_SHEET_CONFIG.origemProdutos.unitColumn,
      INVENTARIO_SHEET_CONFIG.origemProdutos.headerRow,
    );

    return NextResponse.json({ clientes, produtos });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao carregar opções';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


