import { NextResponse } from 'next/server';
import { EstoqueDiff, InventarioLancamentoItem, Quantidade } from '@/domain/types/inventario';
import { estoqueService } from '@/lib/services/estoque-service';

type PreviewRequest = {
  cliente: string;
  itens: InventarioLancamentoItem[];
};

const HTTP_BAD_REQUEST = 400;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PreviewRequest;
    const validationError = validatePayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: HTTP_BAD_REQUEST });
    }

    const { diffs, produtosNaoInformados, estoqueAtual } =
      await estoqueService.avaliarInventario(body.cliente, body.itens);

    return NextResponse.json({
      diffs: formatDiffs(diffs),
      produtosNaoInformados,
      estoqueAtual,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao simular inventário';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validatePayload(body: PreviewRequest | null): string | null {
  if (!body) return 'Payload inválido';
  if (!body.cliente) return 'Tipo de estoque é obrigatório';
  if (!Array.isArray(body.itens) || body.itens.length === 0) {
    return 'Informe ao menos um produto';
  }

  for (const item of body.itens) {
    if (!item.produto) return 'Produto é obrigatório';
    const quantidade = item.quantidade;
    if (!quantidade) return 'Quantidade é obrigatória';
    if (hasNegativeValues(quantidade)) {
      return 'Quantidades não podem ser negativas';
    }
  }

  return null;
}

function hasNegativeValues(quantity: Quantidade): boolean {
  return Object.values(quantity).some((value) => value < 0);
}

function formatDiffs(diffs: EstoqueDiff[]): EstoqueDiff[] {
  return diffs.map((diff) => ({
    ...diff,
    anterior: diff.anterior ?? undefined,
  }));
}


