export function formatCustoUnidade(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatDeltaPercentual(value: number | null): string {
  if (value == null) return '—';
  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `−${formatted}%`;
  return '0%';
}

export function formatDeltaReais(value: number): string {
  const abs = formatCustoUnidade(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

export function formatMargemPercentual(value: number): string {
  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
  if (value < 0) return `−${formatted}%`;
  return `${formatted}%`;
}
