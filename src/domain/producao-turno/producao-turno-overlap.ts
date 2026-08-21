import type { ProducaoTurnoCadastrado } from './producao-turno-types';

export function assertTurnosEtapaValidos(turnos: ProducaoTurnoCadastrado[]): string | null {
  const sorted = [...turnos].sort((a, b) => a.numero - b.numero);
  const numeros = new Set(sorted.map((t) => t.numero));

  if (!numeros.has(1)) {
    return 'O 1º turno é obrigatório.';
  }

  for (const turno of sorted) {
    if (turno.inicio === turno.fim) {
      return 'Início e fim do turno não podem ser iguais.';
    }
  }

  if (numeros.has(3) && !numeros.has(2)) {
    return 'Ligue o 2º turno antes do 3º.';
  }

  return null;
}
