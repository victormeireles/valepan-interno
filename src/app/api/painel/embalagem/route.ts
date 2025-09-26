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
  // Dados de foto
  photoUrl?: string;
  photoId?: string;
  photoUploadedAt?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISO();

    // Buscar dados de pedidos (incluindo colunas de produção M, N, O, P e foto Q, R, S, T)
    const { spreadsheetId: pedidosSpreadsheetId, tabName: pedidosTabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const pedidosRows = await readSheetValues(pedidosSpreadsheetId, `${pedidosTabName}!A:T`);
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

      // Dados de produção (colunas M, N, O, P)
      const producaoCaixas = Number(r[12] || 0);  // M
      const producaoPacotes = Number(r[13] || 0); // N
      const producaoUnidades = Number(r[14] || 0); // O
      const producaoKg = Number(r[15] || 0);      // P
      
      // Dados de foto (colunas Q, R, S, T)
      const photoUrl = (r[17] || '').toString().trim();        // R
      const photoId = (r[18] || '').toString().trim();         // S
      const photoUploadedAt = (r[19] || '').toString().trim(); // T

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
        // Adicionar valores individuais para edição
        caixas: caixas,
        pacotes: pacotes,
        unidades: unidades,
        kg: kg,
        // Dados de foto
        photoUrl: photoUrl || undefined,
        photoId: photoId || undefined,
        photoUploadedAt: photoUploadedAt || undefined,
      });
      
      // Debug log para verificar rowId
      console.log(`Item: ${produto} - Data: ${dataPedido} - RowId: ${rowNumber}`);
    }


    // Montar status no cliente; o front calcula a cor a partir de aProduzir vs produzido
    return NextResponse.json({ items, date });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


