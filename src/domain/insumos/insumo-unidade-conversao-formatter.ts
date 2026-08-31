import {
  InsumoUnidadeConversao,
  type InsumoUnidadeConversaoConfig,
} from '@/domain/insumos/insumo-unidade-conversao';

function formatNumero(value: number, maxFractionDigits = 6): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

export function arredondarNumeroOperacional(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  if (Math.abs(value) < 5) {
    return Math.round(value * 10) / 10;
  }
  return Math.round(value);
}

function formatNumeroArredondado(value: number): string {
  if (value === 0) return '-';
  const arredondado = arredondarNumeroOperacional(value);
  const shouldUseDecimal = Math.abs(value) < 5;
  return arredondado.toLocaleString('pt-BR', {
    minimumFractionDigits: shouldUseDecimal ? 1 : 0,
    maximumFractionDigits: shouldUseDecimal ? 1 : 0,
  });
}

export type InsumoQuantidadeExibida = {
  primaria: string;
  secundaria: string | null;
  valorExibicao: number;
  unidadeExibicao: string;
};

export class InsumoUnidadeConversaoFormatter {
  constructor(
    private readonly unidadeEstoque: string,
    private readonly conversao: InsumoUnidadeConversao,
  ) {}

  static create(
    unidadeEstoque: string,
    config: InsumoUnidadeConversaoConfig | null | undefined,
  ): InsumoUnidadeConversaoFormatter {
    return new InsumoUnidadeConversaoFormatter(
      unidadeEstoque,
      InsumoUnidadeConversao.fromConfig(config),
    );
  }

  formatQuantidade(
    quantidadeEstoque: number,
    options?: { arredondado?: boolean; prefix?: string },
  ): InsumoQuantidadeExibida {
    const format = options?.arredondado ? formatNumeroArredondado : formatNumero;
    const prefix = options?.prefix ?? '';

    if (!this.conversao.isAtiva) {
      const numero = format(quantidadeEstoque);
      const texto =
        numero === '-'
          ? '-'
          : `${prefix}${numero}${this.unidadeEstoque ? ` ${this.unidadeEstoque}` : ''}`;
      return {
        primaria: texto,
        secundaria: null,
        valorExibicao: quantidadeEstoque,
        unidadeExibicao: this.unidadeEstoque,
      };
    }

    const valorExibicao = this.conversao.toExibicao(quantidadeEstoque);
    const unidadeExibicao = this.conversao.unidadeExibicao ?? this.unidadeEstoque;
    const numeroExibicao = format(valorExibicao);
    const primaria =
      numeroExibicao === '-'
        ? '-'
        : `${prefix}${numeroExibicao}${unidadeExibicao ? ` ${unidadeExibicao}` : ''}`;

    const numeroEstoque = formatNumero(quantidadeEstoque);
    const secundaria =
      numeroExibicao === '-'
        ? null
        : `${numeroEstoque}${this.unidadeEstoque ? ` ${this.unidadeEstoque}` : ''}`;

    return {
      primaria,
      secundaria,
      valorExibicao,
      unidadeExibicao,
    };
  }

  formatFatorLabel(): string | null {
    if (!this.conversao.isAtiva || this.conversao.fator == null) return null;
    const unidade = this.conversao.unidadeExibicao ?? 'un';
    return `1 ${unidade} = ${formatNumero(this.conversao.fator)} ${this.unidadeEstoque}`;
  }

  formatEquivalenteEstoque(quantidadeExibicao: number): string {
    const estoque = this.conversao.toEstoque(quantidadeExibicao);
    return `Equivale a ${formatNumero(estoque)}${this.unidadeEstoque ? ` ${this.unidadeEstoque}` : ''}`;
  }

  unidadeCampo(): string {
    if (this.conversao.isAtiva && this.conversao.unidadeExibicao) {
      return this.conversao.unidadeExibicao;
    }
    return this.unidadeEstoque;
  }
}
