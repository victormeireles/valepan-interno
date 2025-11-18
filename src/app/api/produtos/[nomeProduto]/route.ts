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

    const produtoRecord = await productService.findByName(nomeProduto);
    if (!produtoRecord) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const produto = {
      nome: produtoRecord.nome,
      unidade: produtoRecord.unidade,
      unidadeDescricao: produtoRecord.unidadeDescricao,
      codigo: produtoRecord.codigo,
      codigoBarras: produtoRecord.unitBarcode ?? '',
      unPorCaixa: produtoRecord.boxUnits ?? 0,
      unPorPacote: produtoRecord.packageUnits ?? 0,
      pesoLiquido: produtoRecord.unitWeight ?? 0,
    };

    return NextResponse.json({ produto });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


