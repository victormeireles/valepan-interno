import { NextResponse } from 'next/server';
import { estoqueService } from '@/lib/services/estoque-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const allStock = await estoqueService.obterTodosEstoques();
    return NextResponse.json({ data: allStock });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Erro ao buscar dados de estoque' },
      { status: 500 }
    );
  }
}

