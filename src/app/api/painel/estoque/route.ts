import { NextResponse } from 'next/server';
import { estoqueService } from '@/lib/services/estoque-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allStock = await estoqueService.obterTodosEstoques({
      apenasProdutosAtivos: true,
    });
    return NextResponse.json({ data: allStock });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao buscar dados de estoque' },
      { status: 500 }
    );
  }
}
