import { NextResponse } from 'next/server';
import type {
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
} from '@/domain/producao-turno/producao-turno-types';
import {
  TURNO_NAO_CADASTRADO,
  producaoTurnoService,
} from '@/lib/services/producao-turno-service';

export class ProducaoTurnoAtivoPutHandler {
  async handle(etapa: ProducaoTurnoEtapaId, request: Request): Promise<NextResponse> {
    try {
      const numero = await this.parseNumero(request);
      if (numero == null) {
        return NextResponse.json({ error: 'Número de turno inválido' }, { status: 400 });
      }

      const now = new Date();
      await producaoTurnoService.confirm(etapa, numero, now);
      return NextResponse.json({ numero, confirmadoEm: now.toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      const status = message === TURNO_NAO_CADASTRADO ? 400 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  }

  private async parseNumero(request: Request): Promise<ProducaoTurnoNumero | null> {
    const body = await request.json();
    const numero = body?.numero;
    if (numero !== 1 && numero !== 2 && numero !== 3) return null;
    return numero;
  }
}

export const producaoTurnoAtivoPutHandler = new ProducaoTurnoAtivoPutHandler();
