export function formatProdutoCount(value: number): string {
  return value === 0 ? '—' : String(value);
}
