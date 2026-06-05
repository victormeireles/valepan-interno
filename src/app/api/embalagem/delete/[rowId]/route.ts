import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { deleteSheetRow, readSheetValues } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { pedidoEmbalagemService } from '@/lib/services/pedido-embalagem-service';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);
    
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const range = `${tabName}!A${rowNumber}:A${rowNumber}`;
    const rows = await readSheetValues(spreadsheetId, range);
    const dataProducaoRaw = rows[0]?.[0];

    function normalizeToISODate(value: unknown): string {
      if (value == null) return '';
      const str = value.toString().trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
      const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (brMatch) {
        const [, dd, mm, yyyy] = brMatch;
        return `${yyyy}-${mm}-${dd}`;
      }
      const dt = new Date(str);
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      return '';
    }

    const dataProducao = normalizeToISODate(dataProducaoRaw);

    await deleteSheetRow(spreadsheetId, tabName, rowNumber);

    if (dataProducao) {
      try {
        await pedidoEmbalagemService.reconcileForDate(dataProducao);
      } catch (reconcileError) {
        const message =
          reconcileError instanceof Error
            ? reconcileError.message
            : 'Erro ao sincronizar pedido no banco';
        console.error('[embalagem/delete] reconcile falhou:', message);
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    revalidatePath('/api/painel/embalagem');

    return NextResponse.json({ message: 'Pedido deletado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
