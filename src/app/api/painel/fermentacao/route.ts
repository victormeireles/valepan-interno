import { NextResponse } from 'next/server';
import { readSheetValues } from '@/lib/googleSheets';
import { PEDIDOS_FERMENTACAO_CONFIG } from '@/config/fermentacao';

// Helper function to get today's date in ISO format (YYYY-MM-DD)
function getTodayISO(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper function to normalize date to ISO format
function normalizeToISODate(dateStr: string): string {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If in DD/MM/YYYY format, convert to YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as Date and convert to YYYY-MM-DD
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch {
    // Erro ao fazer parse da data
  }
  
  return '';
}

type PainelItemFermentacao = {
  cliente: string; // Not used in fermentacao, but kept for compatibility with generic PainelItem
  produto: string;
  unidade: 'lt' | 'un' | 'kg'; // 'lt' for latas
  aProduzir: number;
  produzido: number;
  dataPedido?: string;
  rowId?: number;
  sourceType: 'pedido' | 'producao';
  latas?: number;
  unidades?: number;
  kg?: number;
  pedidoLatas?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
  fermentacaoFotoUrl?: string;
  fermentacaoFotoId?: string;
  fermentacaoFotoUploadedAt?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISO();

    const { spreadsheetId: pedidosSpreadsheetId, tabName: pedidosTabName } = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    const pedidosRows = await readSheetValues(pedidosSpreadsheetId, `${pedidosTabName}!A:U`); // Read up to U for fermentacao
    const pedidosDataRows = pedidosRows.slice(1);

    const items: PainelItemFermentacao[] = [];

    for (let i = 0; i < pedidosDataRows.length; i++) {
      const r = pedidosDataRows[i];
      const rowNumber = i + 2;
      const dataPedido = normalizeToISODate(r[0]);

      if (dataPedido !== date) continue;

      const produto = (r[1] || '').toString().trim();
      const latas = Number(r[2] || 0);
      const unidades = Number(r[3] || 0);
      const kg = Number(r[4] || 0);

      // Production data (columns O, P, Q) - fermentacao production
      const producaoLatas = Number(r[14] || 0);  // O
      const producaoUnidades = Number(r[15] || 0); // P
      const producaoKg = Number(r[16] || 0);      // Q
      
      // Photo data (columns S, T, U)
      const fermentacaoFotoUrl = (r[18] || '').toString().trim(); // S
      const fermentacaoFotoId = (r[19] || '').toString().trim();  // T
      const fermentacaoFotoUploadedAt = (r[20] || '').toString().trim(); // U

      let unidade: PainelItemFermentacao['unidade'] | '' = '';
      let aProduzir = 0;
      if (latas > 0) { unidade = 'lt'; aProduzir = latas; }
      else if (unidades > 0) { unidade = 'un'; aProduzir = unidades; }
      else if (kg > 0) { unidade = 'kg'; aProduzir = kg; }

      if (!produto || !unidade || aProduzir <= 0) continue;

      let produzido = 0;
      if (unidade === 'lt') { produzido = producaoLatas; }
      else if (unidade === 'un') { produzido = producaoUnidades; }
      else if (unidade === 'kg') { produzido = producaoKg; }

      items.push({
        cliente: 'Fermentacao', // Placeholder as client is not relevant for fermentacao
        produto,
        unidade,
        aProduzir,
        produzido,
        dataPedido,
        rowId: rowNumber,
        sourceType: 'pedido',
        latas: producaoLatas,
        unidades: producaoUnidades,
        kg: producaoKg,
        pedidoLatas: latas,
        pedidoUnidades: unidades,
        pedidoKg: kg,
        fermentacaoFotoUrl: fermentacaoFotoUrl || undefined,
        fermentacaoFotoId: fermentacaoFotoId || undefined,
        fermentacaoFotoUploadedAt: fermentacaoFotoUploadedAt || undefined,
      });
    }

    return NextResponse.json({ items, date });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
