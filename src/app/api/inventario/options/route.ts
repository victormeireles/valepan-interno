import { NextResponse } from 'next/server';
import { getColumnOptions } from '@/lib/googleSheets';
import { INVENTARIO_SHEET_CONFIG } from '@/config/inventario';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

const productService = new SupabaseProductService();

export async function GET() {
  try {
    const clientes = await getColumnOptions(
      INVENTARIO_SHEET_CONFIG.origemClientes.spreadsheetId,
      INVENTARIO_SHEET_CONFIG.origemClientes.tabName,
      INVENTARIO_SHEET_CONFIG.origemClientes.column,
      INVENTARIO_SHEET_CONFIG.origemClientes.headerRow,
    );

    const produtos = await productService.listProducts();

    return NextResponse.json({
      clientes,
      produtos: produtos.map(produto => ({
        produto: produto.nome,
        unidade: produto.unidade,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao carregar opções';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


