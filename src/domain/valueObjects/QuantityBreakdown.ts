export interface QuantityBreakdownEntry {
  quantidade: number;
  unidade: string;
}

export class QuantityBreakdown {
  private readonly entries: QuantityBreakdownEntry[];

  constructor(entries: QuantityBreakdownEntry[]) {
    this.entries = entries.filter((entry) => entry.quantidade > 0);
  }

  public static buildEntries(
    quantities: Array<{ quantidade?: number; unidade: string }>,
  ): QuantityBreakdownEntry[] {
    return quantities
      .filter(({ quantidade }) => Boolean(quantidade) && (quantidade ?? 0) > 0)
      .map(({ quantidade, unidade }) => ({ quantidade: quantidade ?? 0, unidade }));
  }

  public format(fallbackQuantidade?: number, fallbackUnidade?: string): string {
    if (this.entries.length === 0) {
      if (fallbackQuantidade !== undefined && fallbackUnidade) {
        return `${fallbackQuantidade} ${fallbackUnidade}`;
      }

      if (fallbackQuantidade !== undefined) {
        return `${fallbackQuantidade}`;
      }

      return '0';
    }

    return this.entries
      .map((entry) => `${entry.quantidade} ${entry.unidade}`)
      .join(' + ');
  }

  public isEmpty(): boolean {
    return this.entries.length === 0;
  }
}

