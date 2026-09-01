import type {
  PainelEtapaTvLoteFonte,
  PainelEtapaTvUltimoLote,
} from './painel-etapa-tv-types';

export class PainelEtapaTvUltimoLotePicker {
  static fromLotes(lotes: PainelEtapaTvLoteFonte[]): PainelEtapaTvUltimoLote | null {
    if (lotes.length === 0) return null;
    return [...lotes].sort((a, b) => {
      const byTime = Date.parse(b.produzidoEm) - Date.parse(a.produzidoEm);
      if (byTime !== 0) return byTime;
      return b.loteId.localeCompare(a.loteId);
    })[0];
  }
}
