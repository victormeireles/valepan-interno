import { NextResponse } from 'next/server';
import { etiquetaRegistrarService } from '@/lib/services/etiqueta-registrar-service';

type RegistrarRequestBody = {
  ordemProducaoId?: string;
  produtoId?: string;
  tipoEstoqueId?: string;
  dataFabricacao?: string;
  modo?: 'pedido' | 'manual';
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegistrarRequestBody;
    const validationError = validateBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await etiquetaRegistrarService.registrar({
      ordemProducaoId: body.ordemProducaoId,
      produtoId: body.produtoId!,
      tipoEstoqueId: body.tipoEstoqueId!,
      dataFabricacao: body.dataFabricacao!,
      modo: body.modo!,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validateBody(body: RegistrarRequestBody | null): string | null {
  if (!body) return 'Payload inválido';
  if (!body.produtoId) return 'produtoId é obrigatório';
  if (!body.tipoEstoqueId) return 'tipoEstoqueId é obrigatório';
  if (!body.dataFabricacao || !DATE_PATTERN.test(body.dataFabricacao)) {
    return 'dataFabricacao inválida';
  }
  if (body.modo !== 'pedido' && body.modo !== 'manual') {
    return 'modo inválido';
  }
  if (body.modo === 'pedido' && !body.ordemProducaoId) {
    return 'ordemProducaoId é obrigatório para modo pedido';
  }
  return null;
}
