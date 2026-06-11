import { NextResponse } from 'next/server';
import { SaidaQuantidade } from '@/domain/types/saidas';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';
import { saidaMovimentoService } from '@/lib/services/saida-movimento-service';
import { parseSaidaId } from '@/domain/saidas/saida-id';

type UpdateBody = {
  realizado: SaidaQuantidade;
  fotoUrl?: string;
  fotoId?: string;
  quantidadeInicial?: SaidaQuantidade;
};

function isQuantidadeValida(realizado: SaidaQuantidade): boolean {
  return (
    realizado.caixas >= 0 &&
    realizado.pacotes >= 0 &&
    realizado.unidades >= 0 &&
    realizado.kg >= 0
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ rowId: string }> },
) {
  try {
    const { rowId } = await context.params;
    const movimentoId = parseSaidaId(rowId);
    if (!movimentoId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const row = await saidaMovimentoService.getById(movimentoId);
    if (!row) {
      return NextResponse.json({ error: 'Saída não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        meta: row.meta,
        realizado: row.realizado,
        fotoUrl: row.fotoUrl || '',
        fotoId: row.fotoId || '',
        saidaUpdatedAt: row.saidaUpdatedAt || '',
      },
      rowId: movimentoId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ rowId: string }> },
) {
  try {
    const { rowId } = await context.params;
    const movimentoId = parseSaidaId(rowId);
    if (!movimentoId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = (await request.json()) as UpdateBody;
    if (!body?.realizado) {
      return NextResponse.json(
        { error: 'Dados de realizado são obrigatórios' },
        { status: 400 },
      );
    }

    if (!isQuantidadeValida(body.realizado)) {
      return NextResponse.json(
        { error: 'Valores não podem ser negativos' },
        { status: 400 },
      );
    }

    const existingRow = await saidaMovimentoService.getById(movimentoId);
    if (!existingRow) {
      return NextResponse.json({ error: 'Saída não encontrada' }, { status: 404 });
    }

    const isAddingPhotoOnly =
      (body.fotoUrl || body.fotoId) &&
      !existingRow.fotoUrl &&
      existingRow.realizado.caixas === body.realizado.caixas &&
      existingRow.realizado.pacotes === body.realizado.pacotes &&
      existingRow.realizado.unidades === body.realizado.unidades &&
      existingRow.realizado.kg === body.realizado.kg;

    const updatedRow = await saidaMovimentoService.ajustarRealizado(
      movimentoId,
      body.realizado,
      body.quantidadeInicial,
    );

    await whatsAppNotificationService.notifySaidasProduction({
      produto: updatedRow.produto,
      cliente: updatedRow.cliente,
      meta: updatedRow.meta,
      realizado: updatedRow.realizado,
      data: updatedRow.data,
      observacao: updatedRow.observacao || undefined,
      origem: isAddingPhotoOnly ? 'criada' : 'atualizada',
      fotoUrl: body.fotoUrl || updatedRow.fotoUrl,
    });

    return NextResponse.json({ message: 'Saída atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
