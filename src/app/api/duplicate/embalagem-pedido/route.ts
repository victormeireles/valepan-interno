import { NextResponse } from 'next/server';
import { readSheetValues } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';

// Espera que a aba de destino tenha colunas nesta ordem:
// [Data Pedido, Data Fabricação, Cliente, Observação, Produto, Congelado, Caixas, Pacotes, Unidades, Kg, createdAt]
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cliente = searchParams.get('cliente');
  if (!cliente) {
    return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 });
  }

  try {
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const rows = await readSheetValues(spreadsheetId, `${tabName}!A:K`);

    // Ignora header se houver e filtra por cliente
    const dataRows = rows.filter(r => (r[2] || '').toString().trim() === cliente);
    if (dataRows.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Pegar a última linha pelo createdAt (coluna K, index 10) ou pela ordem das linhas
    const sorted = dataRows.sort((a, b) => {
      const ad = new Date(a[10] || a[0] || 0).getTime();
      const bd = new Date(b[10] || b[0] || 0).getTime();
      return bd - ad;
    });
    const lastDate = sorted[0][0];

    // Agrupar itens do mesmo pedido (mesma data do pedido)
    const lastOrderItems = dataRows.filter(r => r[0] === lastDate);

    const items = lastOrderItems.map(r => {
      const caixas = Number(r[6] || 0) || 0;
      const pacotes = Number(r[7] || 0) || 0;
      const unidades = Number(r[8] || 0) || 0;
      const kg = Number(r[9] || 0) || 0;
      let unidade = '' as 'cx' | 'pct' | 'un' | 'kg' | '';
      let quantidade = 0;
      if (caixas > 0) { unidade = 'cx'; quantidade = caixas; }
      else if (pacotes > 0) { unidade = 'pct'; quantidade = pacotes; }
      else if (unidades > 0) { unidade = 'un'; quantidade = unidades; }
      else if (kg > 0) { unidade = 'kg'; quantidade = kg; }
      return {
        produto: r[4] || '',
        congelado: (r[5] || 'Não') as 'Sim' | 'Não',
        unidade,
        quantidade,
      };
    });

    const observacao = lastOrderItems[0]?.[3] || '';

    return NextResponse.json({ items, observacao });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
