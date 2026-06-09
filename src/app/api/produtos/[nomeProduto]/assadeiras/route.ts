import { NextResponse } from 'next/server';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

const productService = new SupabaseProductService();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProdutoAssadeiraRow = {
  assadeira_id: string;
  unidades_por_assadeira: number | null;
  assadeiras: {
    nome: string | null;
    unidades_por_assadeira: number | null;
    ativo: boolean;
  } | null;
};

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

    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from('produto_assadeiras')
      .select('assadeira_id, unidades_por_assadeira, assadeiras(nome, unidades_por_assadeira, ativo)')
      .eq('produto_id', produto.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar assadeiras: ${error.message}`);
    }

    const assadeiras = ((data ?? []) as ProdutoAssadeiraRow[])
      .map((row) => {
        if (!row.assadeiras?.ativo) return null;
        const unidadesPorAssadeiraEfetiva = resolveUnidadesPorAssadeiraEfetiva({
          produto: row.unidades_por_assadeira,
          assadeira: row.assadeiras?.unidades_por_assadeira,
        });
        if (!unidadesPorAssadeiraEfetiva) return null;
        return {
          id: row.assadeira_id,
          nome: row.assadeiras?.nome ?? 'Assadeira',
          unidadesPorAssadeiraEfetiva,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

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
