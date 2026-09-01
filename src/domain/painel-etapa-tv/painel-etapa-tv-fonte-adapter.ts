import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import type {
  PainelEtapaTvLoteFonte,
  PainelEtapaTvOpFonte,
} from './painel-etapa-tv-types';

export class PainelEtapaTvFonteAdapter {
  static fromOrdens(ordens: PainelOrdemEtapa[]): {
    lotes: PainelEtapaTvLoteFonte[];
    ops: PainelEtapaTvOpFonte[];
  } {
    const ops = ordens.map((ordem) => ({
      ordemId: ordem.ordemProducaoId,
      ordemPlanejamento: ordem.ordemPlanejamento,
      finalizada: ordem.finalizada,
      produzido: ordem.produzido,
    }));
    const lotes = ordens.flatMap((ordem) =>
      ordem.lotes.map((lote) => ({
        loteId: lote.loteId,
        ordemId: ordem.ordemProducaoId,
        produtoNome: ordem.produto,
        produzidoEm: lote.produzidoEm,
        quantidade: lote.assadeiras,
      })),
    );
    return { lotes, ops };
  }

  static fromPedidos(pedidos: PainelPedidoEmbalagem[]): {
    lotes: PainelEtapaTvLoteFonte[];
    ops: PainelEtapaTvOpFonte[];
  } {
    const ops = pedidos.map((pedido) => ({
      ordemId: pedido.pedidoEmbalagemId,
      ordemPlanejamento: pedido.ordemPlanejamento,
      finalizada: pedido.finalizada,
      produzido: pedido.produzidoScalar,
    }));
    const lotes = pedidos.flatMap((pedido) =>
      pedido.lotes.map((lote) => ({
        loteId: lote.loteId,
        ordemId: pedido.pedidoEmbalagemId,
        produtoNome: pedido.produto,
        produzidoEm: lote.produzidoEm,
        quantidade: lote.quantidade.caixas,
      })),
    );
    return { lotes, ops };
  }
}
