export type InsumoUnidadeConversaoConfig = {
  unidadeExibicao: string;
  fator: number;
};

export type InsumoUnidadeConversaoFonte = {
  conversaoFator: number | null | undefined;
  conversaoUnidadeResumida: string | null | undefined;
};

export class InsumoUnidadeConversao {
  constructor(private readonly config: InsumoUnidadeConversaoConfig | null) {}

  static fromFonte(fonte: InsumoUnidadeConversaoFonte): InsumoUnidadeConversao {
    const fator = Number(fonte.conversaoFator);
    const unidade = fonte.conversaoUnidadeResumida?.trim();
    if (!unidade || !Number.isFinite(fator) || fator <= 0) {
      return new InsumoUnidadeConversao(null);
    }
    return new InsumoUnidadeConversao({ unidadeExibicao: unidade, fator });
  }

  static fromConfig(
    config: InsumoUnidadeConversaoConfig | null | undefined,
  ): InsumoUnidadeConversao {
    if (!config || !Number.isFinite(config.fator) || config.fator <= 0) {
      return new InsumoUnidadeConversao(null);
    }
    const unidade = config.unidadeExibicao?.trim();
    if (!unidade) return new InsumoUnidadeConversao(null);
    return new InsumoUnidadeConversao({
      unidadeExibicao: unidade,
      fator: config.fator,
    });
  }

  get isAtiva(): boolean {
    return this.config != null;
  }

  get unidadeExibicao(): string | null {
    return this.config?.unidadeExibicao ?? null;
  }

  get fator(): number | null {
    return this.config?.fator ?? null;
  }

  get configValue(): InsumoUnidadeConversaoConfig | null {
    return this.config;
  }

  /** Quantidade persistida (estoque) → quantidade de conferência. */
  toExibicao(quantidadeEstoque: number): number {
    if (!this.config) return quantidadeEstoque;
    return quantidadeEstoque / this.config.fator;
  }

  /** Quantidade de conferência → quantidade persistida (estoque). */
  toEstoque(quantidadeExibicao: number): number {
    if (!this.config) return quantidadeExibicao;
    return quantidadeExibicao * this.config.fator;
  }
}

export const insumoUnidadeConversao = {
  fromFonte: InsumoUnidadeConversao.fromFonte,
  fromConfig: InsumoUnidadeConversao.fromConfig,
};
