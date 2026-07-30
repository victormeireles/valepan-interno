import type { InsumoConsumoPeriodo } from './insumo-consumo-semanal-periodo';
import { insumoConsumoSemanalPeriodoBuilder } from './insumo-consumo-semanal-periodo';
import type { InsumoMovimentoOrigem } from '@/domain/types/insumo-estoque';

export type InsumoConsumoMovimentoFonte = {
  insumoId: string;
  nome: string;
  unidadeResumida: string;
  dataMovimento: string;
  deltaQuantidade: number;
  origem: InsumoMovimentoOrigem;
  fermentacaoLoteId?: string | null;
  fornoLoteId?: string | null;
  embalagemLoteId?: string | null;
  receitaId?: string | null;
  receitaNome?: string | null;
};

export type InsumoConsumoReceitaDetalhe = {
  receitaId: string;
  receitaNome: string;
  consumoPorSemana: Record<string, number>;
  total: number;
};

export type InsumoConsumoSemanalItem = {
  insumoId: string;
  nome: string;
  unidadeResumida: string;
  consumoPorSemana: Record<string, number>;
  total: number;
  receitas: InsumoConsumoReceitaDetalhe[];
  estoqueAtual: number;
  media: number;
  coberturaDias: number | null;
  pico: number;
  coberturaPicoDias: number | null;
};

export class InsumoConsumoSemanalAggregator {
  aggregate(
    periodo: InsumoConsumoPeriodo,
    movimentos: InsumoConsumoMovimentoFonte[],
  ): InsumoConsumoSemanalItem[] {
    const itemsByInsumo = new Map<string, InsumoConsumoSemanalItem>();

    for (const movimento of movimentos) {
      if (!this.isConsumoProducaoVinculado(movimento)) continue;

      const colunaInicio = insumoConsumoSemanalPeriodoBuilder.getColumnStartIsoDate(
        periodo.visualizacao,
        movimento.dataMovimento,
      );
      if (!periodo.colunas.some((coluna) => coluna.inicio === colunaInicio)) continue;

      const item = this.getOrCreateItem(itemsByInsumo, periodo, movimento);
      const consumo = Math.abs(movimento.deltaQuantidade);
      item.consumoPorSemana[colunaInicio] += consumo;
      item.total += consumo;
      this.addReceitaDetalhe(item, periodo, movimento, colunaInicio, consumo);
    }

    return [...itemsByInsumo.values()]
      .map((item) => ({
        ...item,
        receitas: item.receitas.sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  private isConsumoProducaoVinculado(movimento: InsumoConsumoMovimentoFonte): boolean {
    if (movimento.deltaQuantidade >= 0) return false;

    switch (movimento.origem) {
      case 'producao_fermentacao':
        return Boolean(movimento.fermentacaoLoteId);
      case 'producao_forno':
        return Boolean(movimento.fornoLoteId);
      case 'producao_embalagem':
        return Boolean(movimento.embalagemLoteId);
      default:
        return false;
    }
  }

  private getOrCreateItem(
    itemsByInsumo: Map<string, InsumoConsumoSemanalItem>,
    periodo: InsumoConsumoPeriodo,
    movimento: InsumoConsumoMovimentoFonte,
  ): InsumoConsumoSemanalItem {
    const existente = itemsByInsumo.get(movimento.insumoId);
    if (existente) return existente;

    const item: InsumoConsumoSemanalItem = {
      insumoId: movimento.insumoId,
      nome: movimento.nome,
      unidadeResumida: movimento.unidadeResumida,
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
    itemsByInsumo.set(movimento.insumoId, item);
    return item;
  }

  private addReceitaDetalhe(
    item: InsumoConsumoSemanalItem,
    periodo: InsumoConsumoPeriodo,
    movimento: InsumoConsumoMovimentoFonte,
    colunaInicio: string,
    consumo: number,
  ) {
    if (!movimento.receitaId || !movimento.receitaNome) return;

    let detalhe = item.receitas.find((receita) => receita.receitaId === movimento.receitaId);
    if (!detalhe) {
      detalhe = {
        receitaId: movimento.receitaId,
        receitaNome: movimento.receitaNome,
        total: 0,
        consumoPorSemana: Object.fromEntries(
          periodo.colunas.map((coluna) => [coluna.inicio, 0]),
        ),
      };
      item.receitas.push(detalhe);
    }

    detalhe.consumoPorSemana[colunaInicio] += consumo;
    detalhe.total += consumo;
  }
}

export const insumoConsumoSemanalAggregator = new InsumoConsumoSemanalAggregator();
