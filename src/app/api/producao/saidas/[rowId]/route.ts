import { NextResponse } from 'next/server';
import { saidasSheetManager } from '@/lib/managers/saidas-sheet-manager';
import { SaidaRealizadoPayload, SaidaQuantidade } from '@/domain/types/saidas';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';
import { estoqueService } from '@/lib/services/estoque-service';

type UpdateBody = {
  realizado: SaidaQuantidade;
  fotoUrl?: string;
  fotoId?: string;
};

function parseRowId(rowId: string): number | null {
  const parsed = Number(rowId);
  if (Number.isNaN(parsed) || parsed < 2) return null;
  return parsed;
}

function isQuantidadeValida(realizado: SaidaQuantidade): boolean {
  return (
    realizado.caixas >= 0 &&
    realizado.pacotes >= 0 &&
    realizado.unidades >= 0 &&
    realizado.kg >= 0
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ rowId: string }> },
) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseRowId(rowId);
    if (!rowNumber) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const row = await saidasSheetManager.getRow(rowNumber);
    if (!row) {
      return NextResponse.json({ error: 'Linha não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        meta: row.meta,
        realizado: row.realizado,
        fotoUrl: row.fotoUrl || '',
        fotoId: row.fotoId || '',
        saidaUpdatedAt: row.saidaUpdatedAt || '',
      },
      rowId: rowNumber,
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
    const rowNumber = parseRowId(rowId);
    if (!rowNumber) {
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

    const existingRow = await saidasSheetManager.getRow(rowNumber);
    if (!existingRow) {
      return NextResponse.json({ error: 'Linha não encontrada' }, { status: 404 });
    }

    const payload: SaidaRealizadoPayload = {
      rowIndex: rowNumber,
      realizado: body.realizado,
    };

    const photoPayload =
      body.fotoUrl || body.fotoId
        ? { url: body.fotoUrl, id: body.fotoId }
        : undefined;

    // Verifica se é apenas adicionar foto (criação com foto)
    const isAddingPhotoOnly =
      photoPayload &&
      !existingRow.fotoUrl &&
      existingRow.realizado.caixas === body.realizado.caixas &&
      existingRow.realizado.pacotes === body.realizado.pacotes &&
      existingRow.realizado.unidades === body.realizado.unidades &&
      existingRow.realizado.kg === body.realizado.kg;

    await saidasSheetManager.updateRealizado(payload, photoPayload);
    await atualizarEstoque(existingRow, body.realizado);

    const updatedRow = await saidasSheetManager.getRow(rowNumber);
    if (updatedRow) {
      await whatsAppNotificationService.notifySaidasProduction({
        produto: updatedRow.produto,
        cliente: updatedRow.cliente,
        meta: updatedRow.meta,
        realizado: updatedRow.realizado,
        data: updatedRow.data,
        observacao: updatedRow.observacao || undefined,
        // Se é apenas adicionar foto, trata como criação
        origem: isAddingPhotoOnly ? 'criada' : 'atualizada',
        fotoUrl: updatedRow.fotoUrl || undefined,
      });
    }

    return NextResponse.json({ message: 'Saída atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type SaidaRow = NonNullable<Awaited<ReturnType<typeof saidasSheetManager.getRow>>>;

async function atualizarEstoque(
  row: SaidaRow,
  realizadoNovo: SaidaQuantidade,
) {
  const delta = {
    caixas: (realizadoNovo.caixas || 0) - (row.realizado.caixas || 0),
    pacotes: (realizadoNovo.pacotes || 0) - (row.realizado.pacotes || 0),
    unidades: (realizadoNovo.unidades || 0) - (row.realizado.unidades || 0),
    kg: (realizadoNovo.kg || 0) - (row.realizado.kg || 0),
  };

  const houveMudanca =
    delta.caixas !== 0 ||
    delta.pacotes !== 0 ||
    delta.unidades !== 0 ||
    delta.kg !== 0;

  if (!houveMudanca) return;

  await estoqueService.aplicarDelta({
    cliente: row.cliente,
    produto: row.produto,
    delta: {
      caixas: -delta.caixas,
      pacotes: -delta.pacotes,
      unidades: -delta.unidades,
      kg: -delta.kg,
    },
  });
}


