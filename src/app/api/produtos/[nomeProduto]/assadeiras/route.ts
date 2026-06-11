import { NextResponse } from 'next/server';
import { assadeiraResolver } from '@/domain/assadeiras/assadeira-resolver';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

const productService = new SupabaseProductService();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nomeProduto: string }> },
) {
  try {
    const { nomeProduto: produtoParam } = await params;
    const produtoRef = decodeURIComponent(produtoParam);
    if (!produtoRef) {
      return NextResponse.json(
        { error: 'Produto é obrigatório' },
        { status: 400 },
      );
    }

    const produto = UUID_REGEX.test(produtoRef)
      ? await productService.findById(produtoRef)
      : await productService.findByName(produtoRef);

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 },
      );
    }

    const vinculos = await assadeiraResolver.resolveForProduto(produto.id);
    const assadeiras = vinculos.map((v) => ({
      id: v.assadeira_id,
      nome: v.assadeira_nome,
      unidadesPorAssadeiraEfetiva: v.unidades_efetivas,
      origem: v.origem,
    }));

    if (assadeiras.length === 0) {
      return NextResponse.json(
        { error: 'Produto sem assadeiras configuradas' },
        { status: 404 },
      );
    }

    return NextResponse.json({ assadeiras });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
