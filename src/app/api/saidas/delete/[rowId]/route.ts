import { NextResponse } from 'next/server';
import { saidasSheetManager } from '@/lib/managers/saidas-sheet-manager';
import { estoqueService } from '@/lib/services/estoque-service';

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

    const existingRow = await saidasSheetManager.getRow(rowNumber);
    await saidasSheetManager.deleteRow(rowNumber);

    if (existingRow) {
      const quantidade = existingRow.realizado;
      const houveRealizado =
        quantidade.caixas > 0 ||
        quantidade.pacotes > 0 ||
        quantidade.unidades > 0 ||
        quantidade.kg > 0;

      if (houveRealizado) {
        // Obter tipo de estoque do cliente
        const tipoEstoque = await estoqueService.obterTipoEstoqueCliente(existingRow.cliente);
        
        // Creditar estoque de volta SOMENTE se houver tipo de estoque definido
        // Evita criar estoque no nome do cliente se ele não tiver tipo de estoque
        if (tipoEstoque) {
          await estoqueService.aplicarDelta({
            cliente: tipoEstoque,
            produto: existingRow.produto,
            delta: quantidade,
            allowNegative: true,
          });
        }
      }
    }

    return NextResponse.json({ message: 'Saída removida com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


