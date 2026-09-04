import { FluxoDisplayScale } from '@/components/FluxoProcesso/fluxo-display-scale';
import type { FluxoFilasDia } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { PainelEtapaTvFilaAggregator } from '@/domain/painel-etapa-tv/fila-anterior/painel-etapa-tv-fila-aggregator';
import type {
  PainelEtapaTvFilaEtapa,
  PainelEtapaTvFilaOp,
  PainelEtapaTvFilaOpProgresso,
} from '@/domain/painel-etapa-tv/fila-anterior/painel-etapa-tv-fila-op';
import { PainelEtapaTvFilaPicker } from '@/domain/painel-etapa-tv/fila-anterior/painel-etapa-tv-fila-picker';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

/**
 * Monta a fila da etapa anterior (top 3 FIFO) a partir de fluxo.filas.
 * Sempre exibe em LT, mesmo quando o quadro da embalagem está em CX.
 */
export class PainelEtapaTvFilaBuilder {
  static fromFluxo(
    etapa: PainelEtapaTvFilaEtapa,
    fluxo: VpFluxoPayload,
    filas: FluxoFilasDia,
    ordens: PainelOrdemEtapa[],
    pedidos: PainelPedidoEmbalagem[],
  ): PainelEtapaTvFilaOp[] {
    const scale = new FluxoDisplayScale(fluxo, 'lt');
    const progresso = this.progressoMap(etapa, ordens, pedidos);
    const aggregated = PainelEtapaTvFilaAggregator.build(
      filas,
      etapa,
      { unToLt: (un, ass) => scale.fromUn(un, ass) },
      progresso,
    );
    return PainelEtapaTvFilaPicker.pick(aggregated);
  }

  private static progressoMap(
    etapa: PainelEtapaTvFilaEtapa,
    ordens: PainelOrdemEtapa[],
    pedidos: PainelPedidoEmbalagem[],
  ): Map<string, PainelEtapaTvFilaOpProgresso> {
    const map = new Map<string, PainelEtapaTvFilaOpProgresso>();
    if (etapa === 'forno') {
      for (const ordem of ordens) {
        map.set(ordem.ordemProducaoId, {
          feitoLt: ordem.produzido,
          metaLt: ordem.metaEfetiva > 0 ? ordem.metaEfetiva : null,
        });
      }
      return map;
    }
    for (const pedido of pedidos) {
      map.set(pedido.pedidoEmbalagemId, {
        feitoLt: 0,
        metaLt: null,
      });
    }
    return map;
  }
}
