import type { ProducaoTurnoCargaDto } from '@/domain/producao-turno/producao-turno-carga';
import type { ProducaoTurnoEtapaId } from '@/domain/producao-turno/producao-turno-types';
import {
  producaoTurnoService,
  type ProducaoTurnoEstado,
} from '@/lib/services/producao-turno-service';

export async function attachTurnoCarga<T extends object>(
  etapa: ProducaoTurnoEtapaId,
  payload: T,
): Promise<T & ProducaoTurnoCargaDto> {
  const estado = await producaoTurnoService.getEstado(etapa, new Date());
  return {
    ...payload,
    turnos: estado.turnos,
    turnoAtivo: mapTurnoAtivoCarga(estado),
  };
}

function mapTurnoAtivoCarga(
  estado: ProducaoTurnoEstado,
): ProducaoTurnoCargaDto['turnoAtivo'] {
  if (estado.ativo == null) return null;
  return {
    numero: estado.ativo.numero,
    confirmadoEm: estado.ativo.confirmadoEm,
    valido: estado.decision.ativoValido,
  };
}
