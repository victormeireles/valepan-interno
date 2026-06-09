import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import {
  embalagemLoteService,
  EstoqueResolverError,
} from '@/lib/services/embalagem-lote-service';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ loteId: string }> },
) {
  try {
    const { loteId } = await context.params;

    if (!loteId?.trim()) {
      return NextResponse.json({ error: 'ID do lote inválido' }, { status: 400 });
    }

    await embalagemLoteService.excluirLote(loteId);

    revalidatePath('/api/painel/embalagem');
    revalidatePath('/api/painel/estoque');

    return NextResponse.json({ message: 'Lote excluído com sucesso' });
  } catch (error) {
    if (error instanceof EstoqueResolverError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
