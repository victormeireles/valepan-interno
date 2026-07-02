export type EtapaMessageTone = 'success' | 'error' | 'warning';

export function resolveEtapaMessageTone(
  message: string | null | undefined,
): EtapaMessageTone {
  if (!message) return 'success';

  const normalized = message.toLowerCase();

  if (normalized.includes('sucesso') && !normalized.includes('não atualizado')) {
    return 'success';
  }

  if (
    normalized.startsWith('aviso:') ||
    normalized.includes('estoque não atualizado') ||
    normalized.includes('estoque de insumos não atualizado') ||
    normalized.includes('estorno de insumos não concluído')
  ) {
    return 'warning';
  }

  return 'error';
}
