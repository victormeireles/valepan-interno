export type AssadeiraCorRow = {
  nome: string;
  cor_hex?: string | null;
};

export type AssadeiraCorVisual = {
  hex: string;
  pill: {
    background: string;
    borderColor: string;
    color: string;
  };
  cssVar: { '--assadeira-cor': string };
};

export class AssadeiraCor {
  static readonly FALLBACK = '#A8A29E';
  static readonly HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
  static readonly SUGESTOES = [
    '#6B7233',
    '#C6A848',
    '#3F0313',
    '#B45309',
    '#C2410C',
    '#9A6B43',
    '#78716C',
    '#A3374D',
    '#4D7C0F',
    '#CA8A04',
    '#44403C',
    '#9F1239',
  ] as const;

  isValid(value: string): boolean {
    return AssadeiraCor.HEX_PATTERN.test(value.trim());
  }

  normalize(value: string | null | undefined): string {
    const trimmed = value?.trim() ?? '';
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!this.isValid(withHash)) return AssadeiraCor.FALLBACK;
    return withHash.toUpperCase();
  }

  indexByNome(rows: AssadeiraCorRow[]): Record<string, string> {
    const cores: Record<string, string> = {};
    for (const row of rows) {
      cores[row.nome] = this.normalize(row.cor_hex);
    }
    return cores;
  }

  visual(value: string | null | undefined): AssadeiraCorVisual {
    const hex = this.normalize(value);
    const ink = this.inkColor(hex);
    return {
      hex,
      pill: {
        background: `color-mix(in srgb, ${hex} 16%, white)`,
        borderColor: `color-mix(in srgb, ${hex} 42%, white)`,
        color: ink,
      },
      cssVar: { '--assadeira-cor': hex },
    };
  }

  private inkColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance > 0.62) {
      return `color-mix(in srgb, ${hex} 72%, black)`;
    }
    return hex;
  }
}

export const assadeiraCor = new AssadeiraCor();
