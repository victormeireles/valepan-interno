import { QUADRO_NUMEROS_VAZIO, type QuadroNumeros } from './quadro-montagem';

export type QuadroTotaisModo = 'total' | 'operacional';

type TurnoContavel = Pick<QuadroNumeros, 'aprovado' | 'contratados' | 'reservas' | 'livres'> & {
  afastados?: number;
  avisos?: number;
  ferias?: number;
  operacional?: boolean;
};

type SetorContavel = {
  turnos: TurnoContavel[];
};

export class QuadroTotais {
  geral(setores: SetorContavel[], modo: QuadroTotaisModo = 'total'): QuadroNumeros {
    return this.somar(
      setores.flatMap((setor) => setor.turnos),
      modo,
    );
  }

  doSetor(setor: SetorContavel, modo: QuadroTotaisModo = 'total'): QuadroNumeros {
    return this.somar(setor.turnos, modo);
  }

  doTurno(turno: TurnoContavel, modo: QuadroTotaisModo = 'total'): QuadroNumeros {
    return this.ajustar(turno, modo);
  }

  private somar(turnos: TurnoContavel[], modo: QuadroTotaisModo): QuadroNumeros {
    return turnos.reduce<QuadroNumeros>(
      (acumulado, turno) => {
        const numeros = this.ajustar(turno, modo);
        return {
          aprovado: acumulado.aprovado + numeros.aprovado,
          contratados: acumulado.contratados + numeros.contratados,
          reservas: acumulado.reservas + numeros.reservas,
          afastados: acumulado.afastados + numeros.afastados,
          avisos: acumulado.avisos + numeros.avisos,
          livres: acumulado.livres + numeros.livres,
          ferias: (acumulado.ferias ?? 0) + (numeros.ferias ?? 0),
        };
      },
      { ...QUADRO_NUMEROS_VAZIO },
    );
  }

  private ajustar(turno: TurnoContavel, modo: QuadroTotaisModo): QuadroNumeros {
    if (modo === 'operacional' && turno.operacional === false) return { ...QUADRO_NUMEROS_VAZIO };
    const afastados = turno.afastados ?? 0;
    const noQuadro = modo === 'total' ? afastados : 0;
    return {
      aprovado: turno.aprovado,
      contratados: turno.contratados + noQuadro,
      reservas: turno.reservas,
      afastados,
      avisos: turno.avisos ?? 0,
      livres: turno.livres,
      ferias: turno.ferias ?? 0,
    };
  }
}
