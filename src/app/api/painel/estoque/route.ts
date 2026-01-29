import { NextResponse } from 'next/server';
import { estoqueService } from '@/lib/services/estoque-service';

export const revalidate = 3600; // Cache por 1 hora por padrão, invalidado sob demanda

export async function GET() {
  try {
    const allStock = await estoqueService.obterTodosEstoques();
    return NextResponse.json({ data: allStock });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao buscar dados de estoque' },
      { status: 500 }
    );
  }
}
