import type { PainelEtapaTvOpFonte } from './painel-etapa-tv-types';

export class PainelEtapaTvProximasOpsPicker {
  static pick(
    ops: PainelEtapaTvOpFonte[],
    excludeOrdemId: string | null,
    limite = 3,
  ): PainelEtapaTvOpFonte[] {
    const abertas = ops.filter(
      (op) => !op.finalizada && op.ordemId !== excludeOrdemId,
    );
    const parciais = abertas
      .filter((op) => op.produzido > 0)
      .sort((a, b) => a.ordemPlanejamento - b.ordemPlanejamento);
    const pendentes = abertas
      .filter((op) => op.produzido <= 0)
      .sort((a, b) => a.ordemPlanejamento - b.ordemPlanejamento);
    return [...parciais, ...pendentes].slice(0, limite);
  }
}
