import type {
  EtapaProductItem,
  RealizadoEtapaWorklistData,
} from '@/components/Realizado/etapa/types';
import { buildEmbalagemWorklistData } from '@/domain/embalagem/embalagem-etapa-adapter';
import { splitPedidosEmbalagemPorStatus } from '@/domain/embalagem/embalagem-painel-adapter';
import type { PainelEtapaTvId } from '@/domain/painel-etapa-tv/painel-etapa-tv-config';
import { buildFermentacaoWorklistData } from '@/domain/producao-etapa/fermentacao-etapa-adapter';
import { buildFornoWorklistData } from '@/domain/producao-etapa/forno-etapa-adapter';
import { splitOrdensPorFinalizacao } from '@/domain/realizado/etapa-painel-adapter';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

type PainelEtapaTvProductSource = {
  ordens?: PainelOrdemEtapa[];
  pedidos?: PainelPedidoEmbalagem[];
};

const IDLE_IDS = {
  loadingCardId: null,
  deletingLoteId: null,
  creatingLoteOrdemId: null,
  reabrindoOpId: null,
} as const;

function flattenWorklist(worklist: RealizadoEtapaWorklistData): EtapaProductItem[] {
  return [...worklist.gruposAtivos, ...worklist.gruposFinalizados].flatMap(
    (grupo) => grupo.products,
  );
}

export class PainelEtapaTvProductMapper {
  static fromCarga(
    id: PainelEtapaTvId,
    source: PainelEtapaTvProductSource,
    selectedDate: string,
  ): EtapaProductItem[] {
    if (id === 'embalagem') {
      const pedidos = source.pedidos ?? [];
      const { naoFinalizados, finalizados } = splitPedidosEmbalagemPorStatus(pedidos);
      return flattenWorklist(
        buildEmbalagemWorklistData({
          naoFinalizados,
          finalizados,
          pedidos,
          selectedDate,
          loadingCardId: null,
          deletingLoteId: null,
          reabrindoOpId: null,
        }),
      );
    }

    const ordens = source.ordens ?? [];
    const { naoFinalizados, finalizados } = splitOrdensPorFinalizacao(ordens);
    const input = { naoFinalizados, finalizados, ordens, selectedDate, ...IDLE_IDS };
    const worklist =
      id === 'fermentacao'
        ? buildFermentacaoWorklistData(input)
        : buildFornoWorklistData(input);
    return flattenWorklist(worklist);
  }

  static findById(
    products: EtapaProductItem[],
    ordemId: string,
  ): EtapaProductItem | undefined {
    return products.find((product) => product.id === ordemId);
  }
}

export function mapPainelEtapaTvProducts(
  id: PainelEtapaTvId,
  source: PainelEtapaTvProductSource,
  selectedDate: string,
): EtapaProductItem[] {
  return PainelEtapaTvProductMapper.fromCarga(id, source, selectedDate);
}
