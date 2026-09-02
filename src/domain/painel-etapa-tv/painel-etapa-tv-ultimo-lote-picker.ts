import type {
  PainelEtapaTvLoteFonte,
  PainelEtapaTvUltimoLote,
} from './painel-etapa-tv-types';

type JanelaMs = { iniMs: number; fimMs: number };

const OPS_LIMITE = 3;

export class PainelEtapaTvUltimoLotePicker {
  static fromLotes(
    lotes: PainelEtapaTvLoteFonte[],
    janela?: JanelaMs,
  ): PainelEtapaTvUltimoLote | null {
    return this.fromLotesPorOp(lotes, janela, 1)[0] ?? null;
  }

  static fromLotesPorOp(
    lotes: PainelEtapaTvLoteFonte[],
    janela?: JanelaMs,
    limite = OPS_LIMITE,
  ): PainelEtapaTvUltimoLote[] {
    const candidatos = (janela ? lotes.filter((l) => naJanela(l, janela)) : lotes)
      .filter((l) => l.ordemId !== '');
    const ultimoPorOp = new Map<string, PainelEtapaTvLoteFonte>();
    for (const item of ordenarRecente(candidatos)) {
      if (!ultimoPorOp.has(item.ordemId)) {
        ultimoPorOp.set(item.ordemId, item);
      }
    }
    return [...ultimoPorOp.values()].slice(0, limite);
  }
}

function ordenarRecente(lotes: PainelEtapaTvLoteFonte[]): PainelEtapaTvLoteFonte[] {
  return [...lotes].sort((a, b) => {
    const byTime = Date.parse(b.produzidoEm) - Date.parse(a.produzidoEm);
    if (byTime !== 0) return byTime;
    return b.loteId.localeCompare(a.loteId);
  });
}

function naJanela(lote: PainelEtapaTvLoteFonte, janela: JanelaMs): boolean {
  const ms = Date.parse(lote.produzidoEm);
  return ms >= janela.iniMs && ms < janela.fimMs;
}
