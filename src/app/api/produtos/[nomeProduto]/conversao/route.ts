import { NextResponse } from 'next/server';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

const productService = new SupabaseProductService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nomeProduto: string }> }
) {
  try {
    const { nomeProduto: nomeProdutoParam } = await params;
    const nomeProduto = decodeURIComponent(nomeProdutoParam);
    
    if (!nomeProduto) {
      return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 });
    }

    const produto = await productService.findByName(nomeProduto);
    if (!produto) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      box_units: produto.boxUnits ?? null,
      unidades_assadeiras: produto.unidadesAssadeira ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



