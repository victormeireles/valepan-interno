import { NextResponse } from 'next/server';
import { saidasSheetManager } from '@/lib/managers/saidas-sheet-manager';

function parseRowId(rowId: string): number | null {
  const parsed = Number(rowId);
  if (Number.isNaN(parsed) || parsed < 2) return null;
  return parsed;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ rowId: string }> },
) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseRowId(rowId);
    if (!rowNumber) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await saidasSheetManager.deleteRow(rowNumber);
    return NextResponse.json({ message: 'Saída removida com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


