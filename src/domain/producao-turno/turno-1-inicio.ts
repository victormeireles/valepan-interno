import type { ProducaoTurnoCadastrado } from './producao-turno-types';

const CIVIL_FALLBACK = '00:00';

/** Origem da janela operacional: sempre o turno numero 1, nunca o que contém o meio-dia. */
export class Turno1Inicio {
  clock(
    turnos: readonly Pick<ProducaoTurnoCadastrado, 'numero' | 'inicio'>[],
    fallback: string = CIVIL_FALLBACK,
  ): string {
    const t1 = turnos.find((turno) => turno.numero === 1);
    return t1?.inicio ?? fallback;
  }
}
