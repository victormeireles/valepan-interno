export function formatarMoeda(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function resolveCustoInsumoMeta(
  meta: Record<string, unknown> | undefined,
): number | null {
  const raw = meta?.custo_unitario ?? meta?.custoUnitario;
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function calcularCustoTotal(
  quantidade: number,
  custoUnitario: number | null | undefined,
): number | null {
  if (custoUnitario == null || quantidade <= 0) return null;
  return quantidade * custoUnitario;
}

export function formatarCustoPorUnidade(
  custoUnitario: number,
  unidade: string | null | undefined,
): string {
  const unidadeLabel = unidade?.trim() || 'un';
  return `${formatarMoeda(custoUnitario)} / ${unidadeLabel}`;
}

export function formatarValorLateral(
  valor: number,
  unidade: string | null | undefined,
): string | null {
  if (!unidade || valor <= 0) return null;

  const unidadeLower = unidade.toLowerCase().trim();
  const isKg =
    unidadeLower === 'kg' ||
    unidadeLower === 'kilograma' ||
    unidadeLower === 'kilogramas';

  if (isKg && valor < 1) {
    return `${Math.round(valor * 1000)}g`;
  }

  const unidadeFormatada = unidade.replace(/\s+/g, '');
  return `${valor}${unidadeFormatada}`;
}

export function calcularGramas(
  valor: number,
  unidade: string | null | undefined,
): number | null {
  if (!unidade) return null;
  const unidadeLower = unidade.toLowerCase().trim();
  if (
    (unidadeLower === 'kg' ||
      unidadeLower === 'kilograma' ||
      unidadeLower === 'kilogramas') &&
    valor > 0 &&
    valor < 1
  ) {
    return Math.round(valor * 1000);
  }
  return null;
}
