import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { saidaMovimentoService } from '@/lib/services/saida-movimento-service';
import { parseSaidaId } from '@/domain/saidas/saida-id';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ rowId: string }> },
) {
  try {
    const { rowId } = await context.params;
    const movimentoId = parseSaidaId(rowId);
    if (!movimentoId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existingRow = await saidaMovimentoService.estornarSaida(movimentoId);
    if (!existingRow) {
      return NextResponse.json({ error: 'Saída não encontrada' }, { status: 404 });
    }

    revalidatePath('/api/painel/estoque');

    return NextResponse.json({ message: 'Saída removida com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
