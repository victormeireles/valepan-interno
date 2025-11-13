import { NextResponse } from 'next/server';
import {
  InventarioLancamentoPayload,
  InventarioLancamentoItem,
  EstoqueDiff,
  Quantidade,
} from '@/domain/types/inventario';
import { estoqueService } from '@/lib/services/estoque-service';

type InventarioRequestBody = {
  data?: string;
  cliente: string;
  itens: InventarioLancamentoItem[];
};

const HTTP_BAD_REQUEST = 400;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InventarioRequestBody;
    const validationError = validatePayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: HTTP_BAD_REQUEST });
    }

    const payload: InventarioLancamentoPayload = {
      data: body.data ?? getTodayISO(),
      cliente: body.cliente,
      itens: body.itens,
    };

    const { diffs, estoqueAtualizado } = await estoqueService.aplicarInventario(payload);

    return NextResponse.json({
      message: 'Inventário registrado com sucesso',
      diffs: formatDiffs(diffs),
      estoqueAtualizado,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao registrar inventário';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validatePayload(body: InventarioRequestBody | null): string | null {
  if (!body) return 'Payload inválido';
  if (!body.cliente) return 'Cliente é obrigatório';
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

function getTodayISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


