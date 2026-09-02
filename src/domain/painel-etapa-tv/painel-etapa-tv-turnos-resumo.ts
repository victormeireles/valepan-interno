import { parseProducaoTurnoNumero } from '@/domain/producao-turno/producao-turno-numero';
import type {
  ProducaoTurnoCadastrado,
  ProducaoTurnoNumero,
} from '@/domain/producao-turno/producao-turno-types';

export type PainelEtapaTvTurnoEvento = {
  volume: number;
  turno: ProducaoTurnoNumero | null | undefined;
  dataOp: string;
};

export type PainelEtapaTvTurnoFatia = {
  numero: ProducaoTurnoNumero;
  inicio: string;
  fim: string;
  volume: number;
};

export type PainelEtapaTvTurnosResumoDto = {
  total: number;
  fatias: PainelEtapaTvTurnoFatia[];
  semTurno: number;
  outraOp: number;
  outraOpData: string | null;
};

export class PainelEtapaTvTurnosResumo {
  static fromEventos(
    eventos: PainelEtapaTvTurnoEvento[],
    dateISO: string,
    turnos: ProducaoTurnoCadastrado[],
  ): PainelEtapaTvTurnosResumoDto {
    const volumesPorTurno = new Map<ProducaoTurnoNumero, number>();
    for (const turno of turnos) {
      volumesPorTurno.set(turno.numero, 0);
    }

    let total = 0;
    let semTurno = 0;
    let outraOp = 0;
    const datasOutraOp = new Set<string>();

    for (const evento of eventos) {
      total += evento.volume;

      if (evento.dataOp !== dateISO) {
        outraOp += evento.volume;
        datasOutraOp.add(evento.dataOp);
        continue;
      }

      const turnoNumero = parseProducaoTurnoNumero(evento.turno);
      if (turnoNumero === null) {
        semTurno += evento.volume;
        continue;
      }

      if (volumesPorTurno.has(turnoNumero)) {
        volumesPorTurno.set(
          turnoNumero,
          (volumesPorTurno.get(turnoNumero) ?? 0) + evento.volume,
        );
      }
    }

    const fatias: PainelEtapaTvTurnoFatia[] = turnos.map((turno) => ({
      numero: turno.numero,
      inicio: turno.inicio,
      fim: turno.fim,
      volume: volumesPorTurno.get(turno.numero) ?? 0,
    }));

    const outraOpData =
      datasOutraOp.size === 1 ? [...datasOutraOp][0]! : null;

    return { total, fatias, semTurno, outraOp, outraOpData };
  }
}
