import { NextResponse } from 'next/server';
import { estoqueService } from '@/lib/services/estoque-service';
import { Quantidade } from '@/domain/types/inventario';

type UpdateEstoqueRequest = {
  cliente?: string;
  produto?: string;
  quantidade?: Quantidade;
};

const HTTP_BAD_REQUEST = 400;

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UpdateEstoqueRequest;
    const validationError = validatePayload(body);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: HTTP_BAD_REQUEST },
      );
    }

    const record = await estoqueService.definirQuantidadeAbsoluta({
      cliente: body.cliente!,
      produto: body.produto!,
      quantidade: body.quantidade!,
    });

    return NextResponse.json({ data: record });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao atualizar estoque';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validatePayload(body: UpdateEstoqueRequest | null): string | null {
  if (!body) return 'Payload inválido';
  if (!body.cliente) return 'Cliente é obrigatório';
  if (!body.produto) return 'Produto é obrigatório';
  if (!body.quantidade) return 'Quantidade é obrigatória';
  return validateQuantidade(body.quantidade);
}

function validateQuantidade(quantidade: Quantidade): string | null {
  const campos: Array<keyof Quantidade> = [
    'caixas',
    'pacotes',
    'unidades',
    'kg',
  ];

  for (const campo of campos) {
    const valor = quantidade[campo];
    if (typeof valor !== 'number' || Number.isNaN(valor)) {
      return `Valor inválido para ${campo}`;
    }
    if (valor < 0) {
      return `O campo ${campo} não pode ser negativo`;
    }
  }

  return null;
}

