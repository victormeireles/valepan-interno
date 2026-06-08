import { NextResponse } from 'next/server';

import type { EmbalagemLoteFotos } from '@/domain/types/embalagem-lote';
import { embalagemLoteService } from '@/lib/services/embalagem-lote-service';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ rowId: string }> },
) {
  try {
    const { rowId } = await context.params;
    const planilhaRowId = parseInt(rowId, 10);
    if (Number.isNaN(planilhaRowId) || planilhaRowId < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const body = (await request.json()) as EmbalagemLoteFotos;
    await embalagemLoteService.syncFotosFromPlanilhaRow(planilhaRowId, body);

    return NextResponse.json({ message: 'Fotos sincronizadas' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
