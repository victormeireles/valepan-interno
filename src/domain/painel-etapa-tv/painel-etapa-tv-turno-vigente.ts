import { isClockInJanela } from '@/domain/producao-turno/producao-turno-janela';
import type { ProducaoTurnoNumero } from '@/domain/producao-turno/producao-turno-types';

export type PainelEtapaTvTurnoJanela = {
  numero: ProducaoTurnoNumero;
  inicio: string;
  fim: string;
};

export class PainelEtapaTvTurnoVigente {
  static numeros(
    fatias: readonly PainelEtapaTvTurnoJanela[],
    agoraMin: number,
  ): Set<ProducaoTurnoNumero> {
    const vigentes = new Set<ProducaoTurnoNumero>();
    for (const fatia of fatias) {
      if (isClockInJanela(agoraMin, fatia.inicio, fatia.fim)) {
        vigentes.add(fatia.numero);
      }
    }
    return vigentes;
  }

  static primeiro(
    fatias: readonly PainelEtapaTvTurnoJanela[],
    agoraMin: number,
  ): PainelEtapaTvTurnoJanela | null {
    return (
      fatias.find((fatia) => isClockInJanela(agoraMin, fatia.inicio, fatia.fim)) ??
      null
    );
  }
}
