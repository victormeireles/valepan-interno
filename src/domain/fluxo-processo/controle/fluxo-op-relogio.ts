import type {
  FluxoControleEventoInput,
  FluxoControleOpInput,
  FluxoOpRelogioItem,
  FluxoOpRelogioStatus,
} from './fluxo-controle-types';

type RelogioEtapaLote = 'ferm' | 'forno';

const TOLERANCIA_OK_MIN = 5;

function previstoFimParaEtapa(
  op: FluxoControleOpInput,
  etapa: RelogioEtapaLote | 'emb',
): string {
  if (etapa === 'ferm') return op.fermentacaoFimPrevisto;
  if (etapa === 'forno') return op.fornoFimPrevisto;
  return op.embalagemFimPrevisto;
}

function deltaMinutos(realizadoIso: string, previstoIso: string): number {
  return Math.round(
    (Date.parse(realizadoIso) - Date.parse(previstoIso)) / 60_000,
  );
}

function statusPorDelta(deltaMin: number | null): FluxoOpRelogioStatus {
  if (deltaMin === null) return 'sem_lancamento';
  if (Math.abs(deltaMin) <= TOLERANCIA_OK_MIN) return 'ok';
  if (deltaMin > TOLERANCIA_OK_MIN) return 'atrasada';
  return 'adiantada';
}

function montarItem(
  op: FluxoControleOpInput,
  previstoFimIso: string,
  realizadoFimIso: string | null,
  statusOverride?: FluxoOpRelogioStatus,
): FluxoOpRelogioItem {
  const deltaMin =
    realizadoFimIso === null
      ? null
      : deltaMinutos(realizadoFimIso, previstoFimIso);
  return {
    ordemProducaoId: op.id,
    ordemPlanejamento: op.ordemPlanejamento,
    produtoNome: op.produtoNome,
    previstoFimIso,
    realizadoFimIso,
    deltaMin,
    status: statusOverride ?? statusPorDelta(deltaMin),
  };
}

function maxProduzidoEm(eventos: FluxoControleEventoInput[]): string | null {
  if (eventos.length === 0) return null;
  return eventos.reduce(
    (max, ev) =>
      Date.parse(ev.produzidoEm) > Date.parse(max) ? ev.produzidoEm : max,
    eventos[0].produzidoEm,
  );
}

type FifoAlocacao = {
  realizadoFimIso: string | null;
  status: FluxoOpRelogioStatus;
};

type FifoEstado = {
  opIdx: number;
  restante: number;
  ultimoAlocado: string | null;
  result: Map<string, FifoAlocacao>;
};

function fecharOpFifo(
  estado: FifoEstado,
  ops: FluxoControleOpInput[],
  produzidoEm: string,
): void {
  const op = ops[estado.opIdx];
  const delta = deltaMinutos(produzidoEm, previstoFimParaEtapa(op, 'emb'));
  estado.result.set(op.id, {
    realizadoFimIso: produzidoEm,
    status: statusPorDelta(delta),
  });
  estado.opIdx += 1;
  estado.restante = ops[estado.opIdx]?.unidades ?? 0;
}

function consumirEventoFifo(
  estado: FifoEstado,
  ops: FluxoControleOpInput[],
  ev: FluxoControleEventoInput,
): void {
  let unidadesRestantes = ev.unidades;
  while (unidadesRestantes > 0 && estado.opIdx < ops.length) {
    const take = Math.min(unidadesRestantes, estado.restante);
    unidadesRestantes -= take;
    estado.restante -= take;
    estado.ultimoAlocado = ev.produzidoEm;
    if (estado.restante === 0) {
      fecharOpFifo(estado, ops, ev.produzidoEm);
    }
  }
}

function completarPendentesFifo(
  estado: FifoEstado,
  ops: FluxoControleOpInput[],
): void {
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (estado.result.has(op.id)) continue;
    const parcial =
      i === estado.opIdx &&
      estado.restante < op.unidades &&
      estado.ultimoAlocado !== null;
    estado.result.set(
      op.id,
      parcial
        ? { realizadoFimIso: estado.ultimoAlocado, status: 'em_andamento' }
        : { realizadoFimIso: null, status: 'sem_lancamento' },
    );
  }
}

function alocarFifo(
  ops: FluxoControleOpInput[],
  eventos: FluxoControleEventoInput[],
): Map<string, FifoAlocacao> {
  const sortedOps = [...ops].sort(
    (a, b) => a.ordemPlanejamento - b.ordemPlanejamento,
  );
  const sortedEv = [...eventos].sort(
    (a, b) => Date.parse(a.produzidoEm) - Date.parse(b.produzidoEm),
  );
  const estado: FifoEstado = {
    opIdx: 0,
    restante: sortedOps[0]?.unidades ?? 0,
    ultimoAlocado: null,
    result: new Map(),
  };
  for (const ev of sortedEv) {
    consumirEventoFifo(estado, sortedOps, ev);
  }
  completarPendentesFifo(estado, sortedOps);
  return estado.result;
}

function ordenarOps(ops: FluxoControleOpInput[]): FluxoControleOpInput[] {
  return [...ops].sort((a, b) => a.ordemPlanejamento - b.ordemPlanejamento);
}

export class FluxoOpRelogio {
  porLote(
    ops: FluxoControleOpInput[],
    eventos: FluxoControleEventoInput[],
    etapa: RelogioEtapaLote,
  ): FluxoOpRelogioItem[] {
    return ordenarOps(ops).map((op) => {
      const daOp = eventos.filter((e) => e.ordemProducaoId === op.id);
      return montarItem(op, previstoFimParaEtapa(op, etapa), maxProduzidoEm(daOp));
    });
  }

  porFifoEmbalagem(
    ops: FluxoControleOpInput[],
    eventosEmbDoDia: FluxoControleEventoInput[],
  ): FluxoOpRelogioItem[] {
    const ordenadas = ordenarOps(ops);
    const aloc = alocarFifo(ordenadas, eventosEmbDoDia);
    return ordenadas.map((op) => {
      const info = aloc.get(op.id) ?? {
        realizadoFimIso: null,
        status: 'sem_lancamento' as const,
      };
      return montarItem(
        op,
        previstoFimParaEtapa(op, 'emb'),
        info.realizadoFimIso,
        info.status,
      );
    });
  }
}
