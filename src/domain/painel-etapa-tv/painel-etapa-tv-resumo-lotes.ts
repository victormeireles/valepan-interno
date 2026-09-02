import { pedidoUsaCaixasOuPacotes } from '@/domain/embalagem/painel-quantidade';
import { PainelEtapaTvFonteAdapter } from '@/domain/painel-etapa-tv/painel-etapa-tv-fonte-adapter';
import type { PainelEtapaTvId } from '@/domain/painel-etapa-tv/painel-etapa-tv-config';
import type { PainelEtapaTvLoteVolume } from '@/domain/painel-etapa-tv/painel-etapa-tv-op-progresso';
import type { PainelEtapaTvLoteFonte } from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import { ordensParaTotaisLt } from '@/domain/producao-etapa/etapa-totais-visiveis';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

export class PainelEtapaTvResumoLotes {
  static fromCarga(
    etapaId: PainelEtapaTvId,
    ordens: PainelOrdemEtapa[],
    pedidos: PainelPedidoEmbalagem[],
  ): PainelEtapaTvLoteVolume[] {
    const fonte =
      etapaId === 'embalagem'
        ? PainelEtapaTvFonteAdapter.fromPedidos(
            pedidos.filter((pedido) => pedidoUsaCaixasOuPacotes(pedido.pedido)),
          )
        : PainelEtapaTvFonteAdapter.fromOrdens(ordensParaTotaisLt(ordens));
    return fonte.lotes.map((lote) => this.toVolume(lote));
  }

  private static toVolume(lote: PainelEtapaTvLoteFonte): PainelEtapaTvLoteVolume {
    return { produzidoEm: lote.produzidoEm, volume: lote.quantidade };
  }
}
