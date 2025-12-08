import { NextResponse } from 'next/server';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';

const productService = new SupabaseProductService();

export async function GET() {
  try {
    const tiposEstoque = await tiposEstoqueService.listTiposEstoque();
    const tiposEstoqueNomes = tiposEstoque.map((tipo) => tipo.nome);

    const produtos = await productService.listProducts();

    return NextResponse.json({
      clientes: tiposEstoqueNomes,
      produtos: produtos.map(produto => ({
        produto: produto.nome,
        unidade: produto.unidadeNomeResumido || 'un',
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao carregar opções';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


