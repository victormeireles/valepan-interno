export const RECLAMACAO_MAX_FOTOS = 10;

export function assertLimiteFotos(count: number): string | null {
  if (count > RECLAMACAO_MAX_FOTOS) return 'No máximo 10 fotos.';
  if (count < 0) return 'No máximo 10 fotos.';
  return null;
}
