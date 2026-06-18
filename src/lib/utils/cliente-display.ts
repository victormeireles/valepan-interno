/** Primeira letra do nome do cliente, para badge compacto (ex.: Damiao → D). */
export function getClienteInicial(nome: string): string {
  const trimmed = nome.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}
