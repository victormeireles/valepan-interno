import { NextResponse } from 'next/server';
import { readSheetValues } from '@/lib/googleSheets';

export async function GET(
  request: Request,
  { params }: { params: { nomeProduto: string } }
) {
  try {
    const nomeProduto = decodeURIComponent(params.nomeProduto);
    
    if (!nomeProduto) {
      return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 });
    }

    const spreadsheetId = process.env.NEXT_PUBLIC_PRODUTOS_SHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'ID da planilha de produtos não configurado' }, { status: 500 });
    }

    // Ler dados da planilha de produtos
    // Cabeçalho na linha 2, dados a partir da linha 3
    const tabName = 'Produtos';
    const values = await readSheetValues(spreadsheetId, `${tabName}!A:F`);

    // Linha 1 está vazia, linha 2 tem cabeçalhos, linha 3+ tem dados
    if (values.length < 3) {
      return NextResponse.json({ error: 'Planilha de produtos vazia ou sem dados' }, { status: 404 });
    }

    // Buscar o produto (começando da linha 3, índice 2)
    const produtoRow = values.slice(2).find(row => {
      const produto = row[0]?.toString().trim();
      return produto && produto.toLowerCase() === nomeProduto.toLowerCase();
    });

    if (!produtoRow) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Extrair dados conforme as colunas
    // A = Produto, B = Unidade, C = Código de Barras, D = UN Caixa, E = UN Pacote, F = Peso Líquido
    const produto = {
      nome: produtoRow[0]?.toString().trim() || '',
      unidade: produtoRow[1]?.toString().trim() || '',
      codigoBarras: produtoRow[2]?.toString().trim() || '',
      unPorCaixa: parseFloat(produtoRow[3]?.toString().trim() || '0'),
      unPorPacote: parseFloat(produtoRow[4]?.toString().trim() || '0'),
      pesoLiquido: parseFloat(produtoRow[5]?.toString().trim() || '0'),
    };

    return NextResponse.json({ produto });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


