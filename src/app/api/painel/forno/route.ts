import { NextResponse } from 'next/server';
import { readSheetValues } from '@/lib/googleSheets';
import { PEDIDOS_FORNO_CONFIG } from '@/config/forno';

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

type PainelItem = {
  produto: string;
  unidade: 'lt' | 'un' | 'kg';
  aProduzir: number;
  produzido: number;
  dataProducao: string;
  rowId: number;
  // Detalhes
  latas?: number;
  unidades?: number;
  kg?: number;
  prodLatas?: number;
  prodUnidades?: number;
  prodKg?: number;
  fornoFotoUrl?: string;
  fornoFotoId?: string;
  fornoFotoUploadedAt?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISO();

    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const rows = await readSheetValues(spreadsheetId, `${tabName}!A:N`);
    const dataRows = rows.slice(1);

    const items: PainelItem[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const rowNumber = i + 2;
      const dataProducao = normalizeToISODate(r[0]);
      if (dataProducao !== date) continue;

      const produto = (r[1] || '').toString().trim();
      const latas = Number(r[2] || 0);
      const unidades = Number(r[3] || 0);
      const kg = Number(r[4] || 0);

      const prodLatas = Number(r[7] || 0); // H
      const prodUnidades = Number(r[8] || 0); // I
      const prodKg = Number(r[9] || 0); // J

      const fornoFotoUrl = (r[11] || '').toString().trim(); // L
      const fornoFotoId = (r[12] || '').toString().trim(); // M
      const fornoFotoUploadedAt = (r[13] || '').toString().trim(); // N

      // Determinar unidade principal
      let unidade: PainelItem['unidade'] | '' = '';
      let aProduzir = 0;
      if (latas > 0) { unidade = 'lt'; aProduzir = latas; }
      else if (unidades > 0) { unidade = 'un'; aProduzir = unidades; }
      else if (kg > 0) { unidade = 'kg'; aProduzir = kg; }

      if (!produto || !unidade || aProduzir <= 0) continue;

      let produzido = 0;
      if (unidade === 'lt') produzido = prodLatas;
      else if (unidade === 'un') produzido = prodUnidades;
      else if (unidade === 'kg') produzido = prodKg;

      items.push({
        produto,
        unidade,
        aProduzir,
        produzido,
        dataProducao,
        rowId: rowNumber,
        latas,
        unidades,
        kg,
        prodLatas,
        prodUnidades,
        prodKg,
        fornoFotoUrl: fornoFotoUrl || undefined,
        fornoFotoId: fornoFotoId || undefined,
        fornoFotoUploadedAt: fornoFotoUploadedAt || undefined,
      });
    }

    return NextResponse.json({ items, date });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


