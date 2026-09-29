import type { QuadroNumeros } from './quadro-montagem';

type TurnoContavel = Pick<QuadroNumeros, 'aprovado' | 'contratados' | 'reservas' | 'livres'>;

type SetorContavel = {
  turnos: TurnoContavel[];
};

const VAZIO: QuadroNumeros = { aprovado: 0, contratados: 0, reservas: 0, livres: 0 };

export class QuadroTotais {
  geral(setores: SetorContavel[]): QuadroNumeros {
    return this.somar(setores.flatMap((setor) => setor.turnos));
  }

  doSetor(setor: SetorContavel): QuadroNumeros {
    return this.somar(setor.turnos);
  }

  private somar(turnos: TurnoContavel[]): QuadroNumeros {
    return turnos.reduce(
      (acumulado, turno) => ({
        aprovado: acumulado.aprovado + turno.aprovado,
        contratados: acumulado.contratados + turno.contratados,
        reservas: acumulado.reservas + turno.reservas,
        livres: acumulado.livres + turno.livres,
      }),
      { ...VAZIO },
    );
  }
}
