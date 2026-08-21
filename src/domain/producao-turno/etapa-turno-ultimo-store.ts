import { parseProducaoTurnoNumero } from './producao-turno-numero';
import type {
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
} from './producao-turno-types';

export type EtapaTurnoUltimoStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function turnoUltimoStorageKey(etapa: ProducaoTurnoEtapaId): string {
  return `valepan.producao.turno.ultimo.${etapa}`;
}

export class EtapaTurnoUltimoStore {
  constructor(private readonly storage: EtapaTurnoUltimoStorage) {}

  read(etapa: ProducaoTurnoEtapaId): ProducaoTurnoNumero | null {
    try {
      return parseProducaoTurnoNumero(
        this.storage.getItem(turnoUltimoStorageKey(etapa)),
      );
    } catch {
      return null;
    }
  }

  write(etapa: ProducaoTurnoEtapaId, numero: ProducaoTurnoNumero): void {
    try {
      this.storage.setItem(turnoUltimoStorageKey(etapa), String(numero));
    } catch {
      // no-op: localStorage pode falhar (quota / privado)
    }
  }
}
