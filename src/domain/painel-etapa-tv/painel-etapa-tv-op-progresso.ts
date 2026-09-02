import type { JanelaOperacional } from '@/domain/producao-turno/janela-operacional';

export type PainelEtapaTvLoteVolume = { produzidoEm: string; volume: number };

export type PainelEtapaTvOpProgressoDto = {
  feito: number;
  meta: number;
  nestaJanela: number;
  depoisJanela: number;
  antesJanela: number;
  falta: number;
};

export class PainelEtapaTvOpProgresso {
  static fromLotes(
    lotes: PainelEtapaTvLoteVolume[],
    meta: number,
    janela: JanelaOperacional,
  ): PainelEtapaTvOpProgressoDto {
    let feito = 0;
    let nestaJanela = 0;
    let depoisJanela = 0;
    let antesJanela = 0;

    for (const lote of lotes) {
      const produzidoMs = Date.parse(lote.produzidoEm);
      feito += lote.volume;

      if (produzidoMs < janela.iniMs) {
        antesJanela += lote.volume;
      } else if (produzidoMs >= janela.fimMs) {
        depoisJanela += lote.volume;
      } else {
        nestaJanela += lote.volume;
      }
    }

    return {
      feito,
      meta,
      nestaJanela,
      depoisJanela,
      antesJanela,
      falta: Math.max(0, meta - feito),
    };
  }
}
