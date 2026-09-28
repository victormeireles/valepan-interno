import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { extractCalendarDate } from '@/lib/utils/date-utils';

const CHUNK = 80;
const SELECT_ETAPA = 'id, ordem_producao_id, assadeiras, unidades, produzido_em, turno';
const SELECT_EMB =
  'id, ordem_producao_id, produto_id, caixas, pacotes, unidades, kg, produzido_em, turno, data_pedido';

export type FluxoEtapaLoteLeitura = {
  id: string;
  ordemProducaoId: string;
  assadeiras: number;
  unidades: number;
  produzidoEm: string;
  turno: 1 | 2 | 3 | null;
};

export type FluxoEmbLoteLeitura = {
  id: string;
  pedidoEmbalagemId: string | null;
  produtoId: string;
  dataPedido: string;
  produzidoEm: string;
  turno: 1 | 2 | 3 | null;
  quantidade: { caixas: number; pacotes: number; unidades: number; kg: number };
};

export type FluxoLotesDia = {
  ferm: FluxoEtapaLoteLeitura[];
  forno: FluxoEtapaLoteLeitura[];
  emb: FluxoEmbLoteLeitura[];
};

type EtapaTabela = 'fermentacao_lotes' | 'forno_lotes';

/**
 * Lê só horário, quantidade e vínculo da ordem. O fluxo não usa autor nem foto.
 */
export class FluxoLoteLeitura {
  async loadRange(startIso: string, endIso: string): Promise<FluxoLotesDia> {
    const [ferm, forno, emb] = await Promise.all([
      this.listEtapaRange('fermentacao_lotes', startIso, endIso),
      this.listEtapaRange('forno_lotes', startIso, endIso),
      this.listEmbRange(startIso, endIso),
    ]);
    return { ferm, forno, emb };
  }

  async listEtapaByOrdemIds(
    table: EtapaTabela,
    ordemIds: string[],
  ): Promise<Map<string, FluxoEtapaLoteLeitura[]>> {
    const rows = await this.selectIn(table, SELECT_ETAPA, 'ordem_producao_id', ordemIds);
    return groupEtapa(rows.map(mapEtapa));
  }

  async listEmbByOrdemIds(ordemIds: string[]): Promise<Map<string, FluxoEmbLoteLeitura[]>> {
    const rows = await this.selectIn('embalagem_lotes', SELECT_EMB, 'ordem_producao_id', ordemIds);
    return groupEmb(rows.map(mapEmb));
  }

  private async listEtapaRange(
    table: EtapaTabela,
    startIso: string,
    endIso: string,
  ): Promise<FluxoEtapaLoteLeitura[]> {
    const rows = await this.selectRange(table, SELECT_ETAPA, startIso, endIso);
    return rows.map(mapEtapa).sort(byProduzidoEm);
  }

  private async listEmbRange(startIso: string, endIso: string): Promise<FluxoEmbLoteLeitura[]> {
    const rows = await this.selectRange('embalagem_lotes', SELECT_EMB, startIso, endIso);
    return rows.map(mapEmb).sort(byProduzidoEm);
  }

  private async selectRange(
    table: EtapaTabela | 'embalagem_lotes',
    columns: string,
    startIso: string,
    endIso: string,
  ): Promise<Record<string, unknown>[]> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .gte('produzido_em', startIso)
      .lt('produzido_em', endIso);
    if (error) throw new Error(`Erro ao ler lotes de ${table}: ${error.message}`);
    return (data ?? []) as unknown as Record<string, unknown>[];
  }

  private async selectIn(
    table: EtapaTabela | 'embalagem_lotes',
    columns: string,
    column: string,
    ids: string[],
  ): Promise<Record<string, unknown>[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];
    const chunks = chunk(unique, CHUNK);
    const parts = await Promise.all(chunks.map((part) => this.selectChunk(table, columns, column, part)));
    return parts.flat();
  }

  private async selectChunk(
    table: EtapaTabela | 'embalagem_lotes',
    columns: string,
    column: string,
    ids: string[],
  ): Promise<Record<string, unknown>[]> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase.from(table).select(columns).in(column, ids);
    if (error) throw new Error(`Erro ao ler lotes de ${table}: ${error.message}`);
    return (data ?? []) as unknown as Record<string, unknown>[];
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    parts.push(items.slice(index, index + size));
  }
  return parts;
}

function mapEtapa(row: Record<string, unknown>): FluxoEtapaLoteLeitura {
  return {
    id: String(row.id),
    ordemProducaoId: String(row.ordem_producao_id),
    assadeiras: Number(row.assadeiras) || 0,
    unidades: Number(row.unidades) || 0,
    produzidoEm: String(row.produzido_em),
    turno: asTurno(row.turno),
  };
}

function mapEmb(row: Record<string, unknown>): FluxoEmbLoteLeitura {
  const dataPedido = extractCalendarDate(String(row.data_pedido ?? '')) || String(row.data_pedido ?? '');
  return {
    id: String(row.id),
    pedidoEmbalagemId: row.ordem_producao_id ? String(row.ordem_producao_id) : null,
    produtoId: String(row.produto_id),
    dataPedido,
    produzidoEm: String(row.produzido_em),
    turno: asTurno(row.turno),
    quantidade: {
      caixas: Number(row.caixas) || 0,
      pacotes: Number(row.pacotes) || 0,
      unidades: Number(row.unidades) || 0,
      kg: Number(row.kg) || 0,
    },
  };
}

function asTurno(value: unknown): 1 | 2 | 3 | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

function byProduzidoEm(a: { produzidoEm: string }, b: { produzidoEm: string }): number {
  return a.produzidoEm.localeCompare(b.produzidoEm);
}

function groupEtapa(rows: FluxoEtapaLoteLeitura[]): Map<string, FluxoEtapaLoteLeitura[]> {
  const map = new Map<string, FluxoEtapaLoteLeitura[]>();
  for (const row of rows) {
    const list = map.get(row.ordemProducaoId) ?? [];
    list.push(row);
    map.set(row.ordemProducaoId, list);
  }
  return map;
}

function groupEmb(rows: FluxoEmbLoteLeitura[]): Map<string, FluxoEmbLoteLeitura[]> {
  const map = new Map<string, FluxoEmbLoteLeitura[]>();
  for (const row of rows) {
    if (!row.pedidoEmbalagemId) continue;
    const list = map.get(row.pedidoEmbalagemId) ?? [];
    list.push(row);
    map.set(row.pedidoEmbalagemId, list);
  }
  return map;
}

export const fluxoLoteLeitura = new FluxoLoteLeitura();
