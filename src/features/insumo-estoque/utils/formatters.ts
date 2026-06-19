export function formatInsumoQuantidade(value: number, unidade?: string): string {
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return unidade ? `${formatted} ${unidade}` : formatted;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
}

export function origemMovimentoLabel(origem: string): string {
  switch (origem) {
    case 'entrada_nf':
      return 'Entrada NF';
    case 'ajuste_manual':
      return 'Ajuste manual';
    case 'resolucao_pendencia':
      return 'Resolução pendência';
    default:
      return origem;
  }
}

export function origemMovimentoTone(
  origem: string,
): 'success' | 'accent' | 'neutral' {
  switch (origem) {
    case 'entrada_nf':
      return 'success';
    case 'resolucao_pendencia':
      return 'accent';
    default:
      return 'neutral';
  }
}
