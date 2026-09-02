import type {
  PainelEtapaTvLoteFonte,
  PainelEtapaTvUltimoLote,
} from './painel-etapa-tv-types';

type JanelaMs = { iniMs: number; fimMs: number };

export class PainelEtapaTvUltimoLotePicker {
  static fromLotes(
    lotes: PainelEtapaTvLoteFonte[],
    janela?: JanelaMs,
  ): PainelEtapaTvUltimoLote | null {
    const candidatos = janela ? lotes.filter((l) => naJanela(l, janela)) : lotes;
    if (candidatos.length === 0) return null;
    return [...candidatos].sort((a, b) => {
      const byTime = Date.parse(b.produzidoEm) - Date.parse(a.produzidoEm);
      if (byTime !== 0) return byTime;
      return b.loteId.localeCompare(a.loteId);
    })[0];
  }
}

function naJanela(lote: PainelEtapaTvLoteFonte, janela: JanelaMs): boolean {
  const ms = Date.parse(lote.produzidoEm);
  return ms >= janela.iniMs && ms < janela.fimMs;
}
