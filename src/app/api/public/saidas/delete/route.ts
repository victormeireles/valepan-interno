import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { saidasSheetManager } from '@/lib/managers/saidas-sheet-manager';
import { estoqueService } from '@/lib/services/estoque-service';
import { apiKeyAuthService } from '@/lib/services/api-key-auth-service';
import { SaidaQuantidade } from '@/domain/types/saidas';

function isValidDateISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function quantidadesIguais(q1: SaidaQuantidade, q2: SaidaQuantidade): boolean {
  return (
    (q1.caixas || 0) === (q2.caixas || 0) &&
    (q1.pacotes || 0) === (q2.pacotes || 0) &&
    (q1.unidades || 0) === (q2.unidades || 0) &&
    (q1.kg || 0) === (q2.kg || 0)
  );
}

interface DeleteSaidaPayload {
  data: string;
  cliente: string;
  produto: string;
  quantidade: SaidaQuantidade;
}

/**
 * Endpoint público para deletar saídas via API externa
 * Requer autenticação via API Key no header Authorization ou X-API-Key
 * Identifica a saída por data, cliente, produto e quantidade
 */
export async function DELETE(request: Request) {
  try {
    // Validar autenticação
    if (!apiKeyAuthService.validateRequest(request)) {
      return NextResponse.json(
        { error: 'Não autorizado. Forneça uma API key válida no header Authorization ou X-API-Key' },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as DeleteSaidaPayload;

    // Validações de payload
    if (!payload || !isValidDateISO(payload.data)) {
      return NextResponse.json(
        { error: 'Data inválida. Use o formato YYYY-MM-DD' },
        { status: 400 },
      );
    }

    if (!payload.cliente || !payload.produto) {
      return NextResponse.json(
        { error: 'Cliente e produto são obrigatórios' },
        { status: 400 },
      );
    }

    if (!payload.quantidade) {
      return NextResponse.json(
        { error: 'Quantidade é obrigatória' },
        { status: 400 },
      );
    }

    // Buscar todas as saídas da data
    const saidas = await saidasSheetManager.listByDate(payload.data);

    // Filtrar por cliente, produto e quantidade
    const saidasEncontradas = saidas.filter((saida) => {
      const clienteMatch = saida.cliente.trim().toLowerCase() === payload.cliente.trim().toLowerCase();
      const produtoMatch = saida.produto.trim().toLowerCase() === payload.produto.trim().toLowerCase();
      const quantidadeMatch = quantidadesIguais(saida.meta, payload.quantidade);

      return clienteMatch && produtoMatch && quantidadeMatch;
    });

    if (saidasEncontradas.length === 0) {
      return NextResponse.json(
        { error: 'Saída não encontrada com os critérios fornecidos' },
        { status: 404 },
      );
    }

    if (saidasEncontradas.length > 1) {
      return NextResponse.json(
        {
          error: 'Múltiplas saídas encontradas com os critérios fornecidos. Use critérios mais específicos ou forneça o rowId.',
          encontradas: saidasEncontradas.length,
        },
        { status: 409 },
      );
    }

    const existingRow = saidasEncontradas[0];
    const rowNumber = existingRow.rowIndex;

    // Deletar a linha da planilha
    await saidasSheetManager.deleteRow(rowNumber);

    // Se houver realizado, creditar estoque de volta
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

    revalidatePath('/api/painel/estoque');

    return NextResponse.json(
      {
        success: true,
        message: 'Saída removida com sucesso',
        data: {
          rowId: rowNumber,
          cliente: existingRow.cliente,
          produto: existingRow.produto,
          data: existingRow.data,
          estoqueCreditado: houveRealizado,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API Public Saidas Delete] Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}



