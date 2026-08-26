import type { InsumoConsumoPeriodo } from './insumo-consumo-semanal-periodo';
import type { InsumoConsumoSemanalItem } from './insumo-consumo-semanal-aggregator';
import type { InsumoConversaoVisual } from '@/domain/types/insumo-estoque';
import { InsumoUnidadeConversao } from '@/domain/insumos/insumo-unidade-conversao';

export type InsumoConsumoAgregadoFonte = {
  insumoId: string;
  nome: string;
  unidadeResumida: string;
  conversaoFator?: number | null;
  conversaoUnidadeResumida?: string | null;
  colunaInicio: string;
  consumo: number;
};

export class InsumoConsumoAgregadoMapper {
  toSemanalItems(
    periodo: InsumoConsumoPeriodo,
    rows: InsumoConsumoAgregadoFonte[],
  ): InsumoConsumoSemanalItem[] {
    const itemsByInsumo = new Map<string, InsumoConsumoSemanalItem>();
    const colunasValidas = new Set(periodo.colunas.map((coluna) => coluna.inicio));

    for (const row of rows) {
      if (!colunasValidas.has(row.colunaInicio)) continue;

      const item = this.getOrCreateItem(itemsByInsumo, periodo, row);
      item.consumoPorSemana[row.colunaInicio] += row.consumo;
      item.total += row.consumo;
    }

    return [...itemsByInsumo.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }

  private resolveConversao(row: InsumoConsumoAgregadoFonte): InsumoConversaoVisual | null {
    return InsumoUnidadeConversao.fromFonte({
      conversaoFator: row.conversaoFator,
      conversaoUnidadeResumida: row.conversaoUnidadeResumida,
    }).configValue;
  }

  private getOrCreateItem(
    itemsByInsumo: Map<string, InsumoConsumoSemanalItem>,
    periodo: InsumoConsumoPeriodo,
    row: InsumoConsumoAgregadoFonte,
  ): InsumoConsumoSemanalItem {
    const existente = itemsByInsumo.get(row.insumoId);
    if (existente) return existente;

    const item: InsumoConsumoSemanalItem = {
      insumoId: row.insumoId,
      nome: row.nome,
      unidadeResumida: row.unidadeResumida,
      conversao: this.resolveConversao(row),
      total: 0,
      consumoPorSemana: Object.fromEntries(
        periodo.colunas.map((coluna) => [coluna.inicio, 0]),
      ),
      receitas: [],
      estoqueAtual: 0,
      media: 0,
      coberturaDias: null,
      pico: 0,
      coberturaPicoDias: null,
    };
    itemsByInsumo.set(row.insumoId, item);
    return item;
  }
}

export const insumoConsumoAgregadoMapper = new InsumoConsumoAgregadoMapper();
