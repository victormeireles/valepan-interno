import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { rotuloAssadeira } from './fluxo-processo-format';

export type FluxoHoraLegendaItem = {
  assadeira: string;
  rotulo: string;
  cor: string;
  valor: number;
  valorOpAnterior: number;
};

/**
 * Monta a legenda da hora (só assadeiras com volume > 0),
 * na ordem visual do empilhamento (maior volume primeiro).
 */
export class FluxoHoraLegendaBuilder {
  build(
    fluxoCores: Record<string, string>,
    usadas: string[],
    scale: FluxoDisplayScale,
    etapa: FluxoEtapaKey,
    hora: number,
  ): FluxoHoraLegendaItem[] {
    return usadas
      .map((assadeira) => {
        const valor = scale.celula(etapa, assadeira, hora);
        return {
          assadeira,
          rotulo: rotuloAssadeira(assadeira),
          cor: fluxoCores[assadeira] ?? '#78716c',
          valor,
          valorOpAnterior: scale.celulaAnt(etapa, assadeira, hora),
        };
      })
      .filter((item) => item.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  }
}
