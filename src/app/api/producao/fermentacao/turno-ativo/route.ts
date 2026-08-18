import type { ProducaoTurnoEtapaId } from '@/domain/producao-turno/producao-turno-types';
import { producaoTurnoAtivoPutHandler } from '@/app/api/producao/producao-turno-ativo-put';

const etapa: ProducaoTurnoEtapaId = 'fermentacao';

export async function PUT(request: Request) {
  return producaoTurnoAtivoPutHandler.handle(etapa, request);
}
