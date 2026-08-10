'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

import { insumoConsumoRepository } from '@/data/insumos/InsumoConsumoRepository';
import { insumoEstoqueRepository } from '@/data/insumos/InsumoEstoqueRepository';
import { insumoConsumoCoberturaCalculator } from '@/domain/insumos/insumo-consumo-cobertura-calculator';
import { insumoControleEstoqueFilter } from '@/domain/insumos/insumo-controle-estoque-filter';
import type {
  InsumoConsumoReceitaDetalhe,
  InsumoConsumoSemanalItem,
} from '@/domain/insumos/insumo-consumo-semanal-aggregator';
import {
  insumoConsumoSemanalPeriodoBuilder,
  type InsumoConsumoPeriodo,
  type InsumoConsumoVisualizacao,
} from '@/domain/insumos/insumo-consumo-semanal-periodo';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type InsumoConsumoPeriodoInput = {
  dataInicio?: string;
  dataFim?: string;
  visualizacao?: string;
};

export type InsumoConsumoSemanalPageData = {
  periodo: InsumoConsumoPeriodo;
  items: InsumoConsumoSemanalItem[];
};

export async function getInsumoConsumoSemanalPageData(
  input?: InsumoConsumoPeriodoInput,
): Promise<InsumoConsumoSemanalPageData> {
  await requireInternoModulo('interno_insumos', 'ler');
  const periodo = resolveConsumoSemanalPeriodo(input);
  const itemsBrutos = await insumoConsumoRepository.listConsumoSemanal(periodo);
  const items = insumoControleEstoqueFilter.filterPorNomeControlavel(itemsBrutos);
  const saldos = await insumoEstoqueRepository.listQuantidadesByInsumoIds(
    items.map((item) => item.insumoId),
  );

  const itemsComCobertura = items.map((item) => {
    const estoqueAtual = saldos.get(item.insumoId) ?? 0;
    const consumos = periodo.colunas.map(
      (coluna) => item.consumoPorSemana[coluna.inicio] ?? 0,
    );
    const cobertura = insumoConsumoCoberturaCalculator.calculate({
      visualizacao: periodo.visualizacao,
      estoqueAtual,
      consumos,
    });

    return {
      ...item,
      estoqueAtual,
      media: cobertura.media,
      coberturaDias: cobertura.coberturaDias,
      pico: cobertura.pico,
      coberturaPicoDias: cobertura.coberturaPicoDias,
    };
  });

  return {
    periodo,
    items: itemsComCobertura,
  };
}

export async function getInsumoConsumoDetalhesPorProduto(
  input: InsumoConsumoPeriodoInput & { insumoId: string },
): Promise<InsumoConsumoReceitaDetalhe[]> {
  await requireInternoModulo('interno_insumos', 'ler');
  const periodo = resolveConsumoSemanalPeriodo(input);
  return insumoConsumoRepository.listConsumoDetalhesPorProduto({
    insumoId: input.insumoId,
    periodo,
  });
}

function resolveConsumoSemanalPeriodo(
  input?: InsumoConsumoPeriodoInput,
): InsumoConsumoPeriodo {
  const visualizacao = resolveConsumoVisualizacao(input?.visualizacao);

  if (
    input?.dataInicio &&
    input.dataFim &&
    ISO_DATE_PATTERN.test(input.dataInicio) &&
    ISO_DATE_PATTERN.test(input.dataFim)
  ) {
    try {
      return insumoConsumoSemanalPeriodoBuilder.buildFromRange(
        input.dataInicio,
        input.dataFim,
        visualizacao,
      );
    } catch {
      return insumoConsumoSemanalPeriodoBuilder.buildDefault(undefined, visualizacao);
    }
  }

  return insumoConsumoSemanalPeriodoBuilder.buildDefault(undefined, visualizacao);
}

function resolveConsumoVisualizacao(value?: string): InsumoConsumoVisualizacao {
  return value === 'diaria' ? 'diaria' : 'semanal';
}
