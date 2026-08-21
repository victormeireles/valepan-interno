import type { ProducaoTurnoCargaDto } from '@/domain/producao-turno/producao-turno-carga';
import type { ProducaoTurnoEtapaId } from '@/domain/producao-turno/producao-turno-types';
import { configOperacaoMapper } from '@/domain/config-operacao/config-operacao-mapper';
import { configOperacaoService } from '@/lib/services/config-operacao-service';

export async function attachTurnoCarga<T extends object>(
  etapa: ProducaoTurnoEtapaId,
  payload: T,
): Promise<T & ProducaoTurnoCargaDto> {
  const snapshot = await configOperacaoService.getConfig();
  return {
    ...payload,
    turnos: configOperacaoMapper.turnosDaEtapa(snapshot, etapa),
  };
}
