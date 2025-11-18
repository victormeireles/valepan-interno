import { NextResponse } from 'next/server';
import { getColumnOptions } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

const productService = new SupabaseProductService();

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
      const products = await productService.listProducts();
      const options = products.map(product => product.nome);
      const productsWithUnits = products.map(product => ({
        produto: product.nome,
        unidade: product.unidade,
      }));

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


