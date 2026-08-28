export function normalizarObservacao(
  texto: string | null | undefined,
): string | null {
  const trimmed = texto?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export function assertObservacaoCategoria(
  exigeObservacao: boolean,
  observacao: string | null,
): string | null {
  if (exigeObservacao && !observacao) {
    return 'Descreva o problema.';
  }
  return null;
}
