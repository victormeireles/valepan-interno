import { NextResponse } from 'next/server';
import { clientesService } from '@/lib/services/clientes-service';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

const productService = new SupabaseProductService();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'clientes') {
      const options = await clientesService.listActiveDisplayNames();
      return NextResponse.json({ options });
    }

    if (type === 'produtos') {
      const products = await productService.listProducts();
      const options = products.map((product) => product.nome);
      const productsWithUnits = products.map((product) => ({
        produto: product.nome,
        unidade: product.unidadeNomeResumido || 'un',
      }));
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
