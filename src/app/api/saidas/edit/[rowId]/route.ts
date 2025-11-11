import { NextResponse } from 'next/server';
import { saidasSheetManager } from '@/lib/managers/saidas-sheet-manager';
import { SaidaMetaPayload } from '@/domain/types/saidas';

function parseRowId(rowId: string): number | null {
  const parsed = Number(rowId);
  if (Number.isNaN(parsed) || parsed < 2) return null;
  return parsed;
}

function isValidDateISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasQuantidadeValida(meta: SaidaMetaPayload['meta']): boolean {
  return (
    meta.caixas > 0 ||
    meta.pacotes > 0 ||
    meta.unidades > 0 ||
    meta.kg > 0
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
        data: row.data,
        cliente: row.cliente,
        observacao: row.observacao,
        produto: row.produto,
        meta: row.meta,
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

    const payload = (await request.json()) as SaidaMetaPayload;

    if (!payload || !isValidDateISO(payload.data)) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }

    if (!payload.cliente || !payload.produto) {
      return NextResponse.json(
        { error: 'Cliente e produto são obrigatórios' },
        { status: 400 },
      );
    }

    if (!hasQuantidadeValida(payload.meta)) {
      return NextResponse.json(
        { error: 'Informe quantidades na meta' },
        { status: 400 },
      );
    }

    await saidasSheetManager.updateMeta(rowNumber, payload);

    return NextResponse.json({ message: 'Meta atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


