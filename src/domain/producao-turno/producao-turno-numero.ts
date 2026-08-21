import type { ProducaoTurnoNumero } from './producao-turno-types';

export const TURNO_INFORME_MESSAGE = 'Informe o turno.';
export const TURNO_NAO_CADASTRADO_MESSAGE = 'Turno não cadastrado para esta etapa.';

export function parseProducaoTurnoNumero(value: unknown): ProducaoTurnoNumero | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

export class TurnoNaoCadastradoError extends Error {
  readonly code = 'turno_nao_cadastrado' as const;
  constructor() {
    super(TURNO_NAO_CADASTRADO_MESSAGE);
    this.name = 'TurnoNaoCadastradoError';
  }
}
