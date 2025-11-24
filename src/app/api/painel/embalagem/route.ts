import { NextResponse } from 'next/server';
import { readSheetValues } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import {
  getTodayISOInBrazilTimezone,
  normalizeToISODate,
} from '@/lib/utils/date-utils';
import { estoqueService } from '@/lib/services/estoque-service';

type PainelItem = {
  cliente: string;
  produto: string;
  unidade: 'cx' | 'pct' | 'un' | 'kg';
  congelado: 'Sim' | 'Não';
  observacao: string;
  aProduzir: number;
  produzido: number;
  dataPedido?: string; // Data de produção
  dataFabricacao: string; // Data de fabricação na etiqueta
  rowId?: number; // Número da linha no Google Sheets
  sourceType: 'pedido' | 'producao'; // Tipo de origem dos dados
  // Valores individuais para edição
  caixas?: number;
  pacotes?: number;
  unidades?: number;
  kg?: number;
  // Dados do pedido original para exibição
  pedidoCaixas?: number;
  pedidoPacotes?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
  // Dados de etiqueta
  lote?: number;
  etiquetaGerada?: boolean;
  possuiEtiqueta?: boolean;
  // Dados de fotos (novos campos)
  pacoteFotoUrl?: string;
  pacoteFotoId?: string;
  pacoteFotoUploadedAt?: string;
  etiquetaFotoUrl?: string;
  etiquetaFotoId?: string;
  etiquetaFotoUploadedAt?: string;
  palletFotoUrl?: string;
  palletFotoId?: string;
  palletFotoUploadedAt?: string;
  // Observação de embalagem
  obsEmbalagem?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISOInBrazilTimezone();

    // Buscar dados de pedidos (incluindo colunas de produção M, N, O, P, fotos R-Z, lote/etiqueta AA-AB e obs embalagem AC)
    const { spreadsheetId: pedidosSpreadsheetId, tabName: pedidosTabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const pedidosRows = await readSheetValues(pedidosSpreadsheetId, `${pedidosTabName}!A:AC`);
    const pedidosDataRows = pedidosRows.slice(1);

    const items: PainelItem[] = [];
    const clientesComEtiquetaCache = new Map<string, boolean>();

    // Função auxiliar para verificar se cliente possui etiqueta (com cache)
    const clientePossuiEtiqueta = async (cliente: string): Promise<boolean> => {
      if (clientesComEtiquetaCache.has(cliente)) {
        return clientesComEtiquetaCache.get(cliente)!;
      }
      
      try {
        const possuiEtiqueta = await estoqueService.clientePossuiEtiqueta(cliente);
        clientesComEtiquetaCache.set(cliente, possuiEtiqueta);
        return possuiEtiqueta;
      } catch (_error) {
        clientesComEtiquetaCache.set(cliente, false);
        return false;
      }
    };

    // Processar pedidos (aProduzir) - processar todas as linhas para obter rowId correto
    for (let i = 0; i < pedidosDataRows.length; i++) {
      const r = pedidosDataRows[i];
      const rowNumber = i + 2; // +2 porque começamos do índice 0 e pulamos o header
      const dataPedido = normalizeToISODate(r[0]);
      
      // Filtrar apenas pela data selecionada
      if (dataPedido !== date) continue;
      
      const dataFabricacao = normalizeToISODate(r[1]);
      const cliente = (r[2] || '').toString().trim();
      const observacao = (r[3] || '').toString().trim();
      const produto = (r[4] || '').toString().trim();
      const congelado = ((r[5] || 'Não').toString().trim() === 'Sim' ? 'Sim' : 'Não') as 'Sim' | 'Não';
      const caixas = Number(r[6] || 0);
      const pacotes = Number(r[7] || 0);
      const unidades = Number(r[8] || 0);
      const kg = Number(r[9] || 0);

      // Dados de produção (colunas M, N, O, P)
      const producaoCaixas = Number(r[12] || 0);  // M
      const producaoPacotes = Number(r[13] || 0); // N
      const producaoUnidades = Number(r[14] || 0); // O
      const producaoKg = Number(r[15] || 0);      // P
      
      // Dados de fotos (colunas R, S, T, U, V, W, X, Y, Z)
      const pacoteFotoUrl = (r[17] || '').toString().trim();        // R
      const pacoteFotoId = (r[18] || '').toString().trim();         // S
      const pacoteFotoUploadedAt = (r[19] || '').toString().trim(); // T
      const etiquetaFotoUrl = (r[20] || '').toString().trim();      // U
      const etiquetaFotoId = (r[21] || '').toString().trim();       // V
      const etiquetaFotoUploadedAt = (r[22] || '').toString().trim(); // W
      const palletFotoUrl = (r[23] || '').toString().trim();        // X
      const palletFotoId = (r[24] || '').toString().trim();         // Y
      const palletFotoUploadedAt = (r[25] || '').toString().trim(); // Z

      // Dados de lote e etiqueta (colunas AA, AB)
      const lote = Number(r[26] || 0); // AA (índice 26)
      const etiquetaGeradaStr = (r[27] || '').toString().trim(); // AB (índice 27)
      const etiquetaGerada = etiquetaGeradaStr.toLowerCase() === 'sim';
      
      // Dados de observação de embalagem (coluna AC)
      const obsEmbalagem = (r[28] || '').toString().trim(); // AC (índice 28)

      let unidade: PainelItem['unidade'] | '' = '';
      let aProduzir = 0;
      if (caixas > 0) { unidade = 'cx'; aProduzir = caixas; }
      else if (pacotes > 0) { unidade = 'pct'; aProduzir = pacotes; }
      else if (unidades > 0) { unidade = 'un'; aProduzir = unidades; }
      else if (kg > 0) { unidade = 'kg'; aProduzir = kg; }

      if (!cliente || !produto || !unidade || aProduzir <= 0) continue;

      // Calcular o que foi produzido baseado na unidade do pedido
      let produzido = 0;
      if (unidade === 'cx') { produzido = producaoCaixas; }
      else if (unidade === 'pct') { produzido = producaoPacotes; }
      else if (unidade === 'un') { produzido = producaoUnidades; }
      else if (unidade === 'kg') { produzido = producaoKg; }

      // Verificar se o cliente possui etiqueta
      const possuiEtiqueta = await clientePossuiEtiqueta(cliente);

      // Cada item é individual, não agrupar
      items.push({
        cliente,
        produto,
        unidade,
        congelado,
        observacao,
        aProduzir,
        produzido, // Usar dados de produção das colunas M, N, O, P
        dataPedido: dataPedido,
        dataFabricacao,
        rowId: rowNumber,
        sourceType: 'pedido',
        // Valores de PRODUÇÃO (o que foi realmente produzido)
        caixas: producaoCaixas,
        pacotes: producaoPacotes,
        unidades: producaoUnidades,
        kg: producaoKg,
        // Valores do PEDIDO (o que foi pedido originalmente)
        pedidoCaixas: caixas,
        pedidoPacotes: pacotes,
        pedidoUnidades: unidades,
        pedidoKg: kg,
        // Dados de etiqueta
        lote: lote || undefined,
        etiquetaGerada,
        possuiEtiqueta,
        // Dados de fotos
        pacoteFotoUrl: pacoteFotoUrl || undefined,
        pacoteFotoId: pacoteFotoId || undefined,
        pacoteFotoUploadedAt: pacoteFotoUploadedAt || undefined,
        etiquetaFotoUrl: etiquetaFotoUrl || undefined,
        etiquetaFotoId: etiquetaFotoId || undefined,
        etiquetaFotoUploadedAt: etiquetaFotoUploadedAt || undefined,
        palletFotoUrl: palletFotoUrl || undefined,
        palletFotoId: palletFotoId || undefined,
        palletFotoUploadedAt: palletFotoUploadedAt || undefined,
        obsEmbalagem: obsEmbalagem || undefined,
      });
    }


    // Montar status no cliente; o front calcula a cor a partir de aProduzir vs produzido
    return NextResponse.json({ items, date });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


