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
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISO();

    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;

    // Leitura ampla das colunas necessárias (A:K conforme gravação da rota de submit)
    const rows = await readSheetValues(spreadsheetId, `${tabName}!A:K`);

    // Ignorar header
    const dataRows = rows.slice(1);

    // Filtrar por data de produção (coluna A)
    const todaysRows = dataRows.filter(r => normalizeToISODate(r[0]) === date);

    const items: PainelItem[] = [];

    for (const r of todaysRows) {
      const cliente = (r[2] || '').toString().trim();
      const observacao = (r[3] || '').toString().trim();
      const produto = (r[4] || '').toString().trim();
      const congelado = ((r[5] || 'Não').toString().trim() === 'Sim' ? 'Sim' : 'Não') as 'Sim' | 'Não';
      const caixas = Number(r[6] || 0);
      const pacotes = Number(r[7] || 0);
      const unidades = Number(r[8] || 0);
      const kg = Number(r[9] || 0);

      let unidade: PainelItem['unidade'] | '' = '';
      let aProduzir = 0;
      if (caixas > 0) { unidade = 'cx'; aProduzir = caixas; }
      else if (pacotes > 0) { unidade = 'pct'; aProduzir = pacotes; }
      else if (unidades > 0) { unidade = 'un'; aProduzir = unidades; }
      else if (kg > 0) { unidade = 'kg'; aProduzir = kg; }

      if (!cliente || !produto || !unidade || aProduzir <= 0) continue;

      // Agrupar por cliente/produto/unidade/congelado
      const sameIdx = items.findIndex(it => 
        it.cliente === cliente && 
        it.produto === produto && 
        it.unidade === unidade &&
        it.congelado === congelado
      );

      if (sameIdx >= 0) {
        items[sameIdx].aProduzir += aProduzir;
      } else {
        items.push({
          cliente,
          produto,
          unidade,
          congelado,
          observacao,
          aProduzir,
          produzido: 0, // Por enquanto 0; futura integração com planilha de produção de embalagem
        });
      }
    }

    // Montar status no cliente; o front calcula a cor a partir de aProduzir vs produzido
    return NextResponse.json({ items, date });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


