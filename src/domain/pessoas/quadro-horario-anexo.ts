import type { HorarioDiaQuadro, QuadroSetor } from './quadro-agrupamento';
import type { QuadroLinha } from './quadro-visao';

export type HorarioTurnoCarga = {
  turnoCodigo: string;
  turnoNome: string;
  setorNome: string;
  setorCodigo: string;
  dias: HorarioDiaQuadro[];
};

export class QuadroHorarioAnexo {
  completar(linhas: QuadroLinha[], itens: HorarioTurnoCarga[]): QuadroLinha[] {
    const presentes = new Set(linhas.map((linha) => linha.turnoCodigo));
    const extras = itens
      .filter((item) => item.turnoCodigo && !presentes.has(item.turnoCodigo))
      .map((item) => ({
        setorNome: item.setorNome,
        turnoNome: item.turnoNome,
        turnoCodigo: item.turnoCodigo,
        aprovado: 0,
        contratados: 0,
        reservas: 0,
        livres: 0,
      }));
    return [...linhas, ...extras];
  }

  aplicar(setores: QuadroSetor[], itens: HorarioTurnoCarga[]): QuadroSetor[] {
    const porTurno = new Map(itens.map((item) => [item.turnoCodigo, item]));
    const porSetor = new Map(itens.map((item) => [item.setorNome, item.setorCodigo]));
    return setores.map((setor) => ({
      ...setor,
      setorCodigo: porSetor.get(setor.setorNome) ?? setor.setorCodigo,
      turnos: setor.turnos.map((turno) => ({
        ...turno,
        horario: porTurno.get(turno.turnoCodigo)?.dias ?? turno.horario,
      })),
    }));
  }
}
