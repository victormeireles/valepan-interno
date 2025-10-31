import { NextResponse } from 'next/server';
import { readSheetValues } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';

function getTodayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeToISODate(value: unknown): string {
  if (value == null) return '';
  const str = value.toString().trim();
  // ISO já formatado
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // Formato brasileiro dd/mm/aaaa
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  // Tentar parsear datas como string completa
  const dt = new Date(str);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return '';
}

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
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISO();

    // Buscar dados de pedidos (incluindo colunas de lote M, N, produção O, P, Q, R e fotos S, T, U, V, W, X, Y, Z, AA)
    const { spreadsheetId: pedidosSpreadsheetId, tabName: pedidosTabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const pedidosRows = await readSheetValues(pedidosSpreadsheetId, `${pedidosTabName}!A:AA`);
    const pedidosDataRows = pedidosRows.slice(1);

    const items: PainelItem[] = [];

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

      // Dados de lote e etiqueta (colunas M, N)
      // M = índice 12 (A=0, B=1, ..., M=12)
      const loteValue = r[12];
      const lote = loteValue ? Number(loteValue) : 0; // M
      const etiquetaGeradaStr = (r[13] || '').toString().trim(); // N
      const etiquetaGerada = etiquetaGeradaStr.toLowerCase() === 'sim';

      // Dados de produção (colunas O, P, Q, R)
      const producaoCaixas = Number(r[14] || 0);  // O
      const producaoPacotes = Number(r[15] || 0); // P
      const producaoUnidades = Number(r[16] || 0); // Q
      const producaoKg = Number(r[17] || 0);      // R
      
      // Dados de fotos (colunas S, T, U, V, W, X, Y, Z, AA)
      const pacoteFotoUrl = (r[18] || '').toString().trim();        // S
      const pacoteFotoId = (r[19] || '').toString().trim();         // T
      const pacoteFotoUploadedAt = (r[20] || '').toString().trim(); // U
      const etiquetaFotoUrl = (r[21] || '').toString().trim();      // V
      const etiquetaFotoId = (r[22] || '').toString().trim();       // W
      const etiquetaFotoUploadedAt = (r[23] || '').toString().trim(); // X
      const palletFotoUrl = (r[24] || '').toString().trim();        // Y
      const palletFotoId = (r[25] || '').toString().trim();         // Z
      const palletFotoUploadedAt = (r[26] || '').toString().trim(); // AA

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

      // Cada item é individual, não agrupar
      const item = {
        cliente,
        produto,
        unidade,
        congelado,
        observacao,
        aProduzir,
        produzido, // Usar dados de produção das colunas O, P, Q, R
        dataPedido: dataPedido,
        dataFabricacao,
        rowId: rowNumber,
        sourceType: 'pedido' as const,
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
        lote: lote > 0 ? lote : undefined,
        etiquetaGerada,
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
      };
      
      items.push(item);
      
      // Debug log para verificar rowId
      console.log(`[API] Item adicionado: ${produto} | Cliente: ${cliente} | Data: ${dataPedido} | RowId: ${rowNumber} | DataFab: ${dataFabricacao} | Obs: ${observacao}`);
    }


    // Montar status no cliente; o front calcula a cor a partir de aProduzir vs produzido
    console.log(`[API] Total de itens retornados para data ${date}:`, items.length);
    console.log(`[API] Itens ordenados por rowId:`, items.map(i => ({
      rowId: i.rowId,
      cliente: i.cliente,
      produto: i.produto,
      dataFabricacao: i.dataFabricacao,
      observacao: i.observacao
    })).sort((a, b) => (a.rowId || 0) - (b.rowId || 0)));
    
    return NextResponse.json({ items, date });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


