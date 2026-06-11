import { NextResponse } from 'next/server';
import { estoqueService } from '@/lib/services/estoque-service';
import type { EstoqueMovimentoOrigem } from '@/domain/types/estoque-db';

const ORIGENS: EstoqueMovimentoOrigem[] = [
  'embalagem',
  'saida',
  'ajuste_manual',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origemParam = searchParams.get('origem');
    const origem =
      origemParam && ORIGENS.includes(origemParam as EstoqueMovimentoOrigem)
        ? (origemParam as EstoqueMovimentoOrigem)
        : undefined;

    const data = await estoqueService.listarMovimentos({
      tipoEstoqueId: searchParams.get('tipoEstoqueId') ?? undefined,
      produtoId: searchParams.get('produtoId') ?? undefined,
      origem,
      de: searchParams.get('de') ?? undefined,
      ate: searchParams.get('ate') ?? undefined,
      limit: searchParams.get('limit')
        ? Number(searchParams.get('limit'))
        : 100,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
