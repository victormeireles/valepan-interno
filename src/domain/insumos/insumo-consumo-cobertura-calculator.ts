import type { InsumoConsumoVisualizacao } from './insumo-consumo-semanal-periodo';

export type InsumoConsumoCoberturaInput = {
  visualizacao: InsumoConsumoVisualizacao;
  estoqueAtual: number;
  consumos: number[];
};

export type InsumoConsumoCoberturaResult = {
  media: number;
  coberturaDias: number | null;
  pico: number;
  coberturaPicoDias: number | null;
};

export class InsumoConsumoCoberturaCalculator {
  calculate(input: InsumoConsumoCoberturaInput): InsumoConsumoCoberturaResult {
    const { consumos, estoqueAtual, visualizacao } = input;
    const n = consumos.length;
    const soma = consumos.reduce((acc, value) => acc + value, 0);
    const media = n === 0 ? 0 : soma / n;
    const pico = n === 0 ? 0 : Math.max(...consumos);

    return {
      media,
      pico,
      coberturaDias: this.coberturaDias(visualizacao, estoqueAtual, media),
      coberturaPicoDias: this.coberturaDias(visualizacao, estoqueAtual, pico),
    };
  }

  private coberturaDias(
    visualizacao: InsumoConsumoVisualizacao,
    estoqueAtual: number,
    consumoReferencia: number,
  ): number | null {
    if (consumoReferencia <= 0) return null;
    if (estoqueAtual <= 0) return 0;

    const consumoDiario =
      visualizacao === 'semanal' ? consumoReferencia / 7 : consumoReferencia;

    return Math.max(0, Math.round(estoqueAtual / consumoDiario));
  }
}

export const insumoConsumoCoberturaCalculator = new InsumoConsumoCoberturaCalculator();
