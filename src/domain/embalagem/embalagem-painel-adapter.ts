import { isPedidoEmbalagemFinalizado } from '@/domain/realizado/painel-pedido-adapter';
import {
  menorOrdemPlanejamento,
  sortPorOrdemPlanejamento,
} from '@/domain/realizado/ordem-planejamento-sort';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { RealizadoGroup } from '@/domain/types/realizado';

export type EmbalagemPainelGroup = RealizadoGroup & {
  cliente?: string;
  dataFabricacao?: string;
  observacao?: string;
  pedidos: PainelPedidoEmbalagem[];
};

function buildGroupKey(pedido: PainelPedidoEmbalagem, fallbackDate: string): string {
  const dataFab = pedido.dataFabricacao || fallbackDate;
  const obs = pedido.observacao?.trim() || '';
  return `${pedido.cliente}|${dataFab}|${obs}`;
}

function sortGruposPorOrdemPlanejamento(
  grupos: EmbalagemPainelGroup[],
): EmbalagemPainelGroup[] {
  return [...grupos].sort(
    (a, b) => menorOrdemPlanejamento(a.pedidos) - menorOrdemPlanejamento(b.pedidos),
  );
}

export function splitPedidosEmbalagemPorStatus(
  pedidos: PainelPedidoEmbalagem[],
): {
  naoFinalizados: PainelPedidoEmbalagem[];
  finalizados: PainelPedidoEmbalagem[];
} {
  const sorted = sortPorOrdemPlanejamento(pedidos);

  return {
    naoFinalizados: sorted.filter((pedido) => !isPedidoEmbalagemFinalizado(pedido)),
    finalizados: sorted.filter((pedido) => isPedidoEmbalagemFinalizado(pedido)),
  };
}

export function splitPedidosEmbalagemEmGrupos(
  pedidos: PainelPedidoEmbalagem[],
  selectedDate: string,
): {
  gruposNaoFinalizados: EmbalagemPainelGroup[];
  gruposFinalizados: EmbalagemPainelGroup[];
} {
  const groups: Record<string, PainelPedidoEmbalagem[]> = {};

  for (const pedido of sortPorOrdemPlanejamento(pedidos)) {
    const groupKey = buildGroupKey(pedido, selectedDate);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(pedido);
  }

  const gruposNaoFinalizados: EmbalagemPainelGroup[] = [];
  const gruposFinalizados: EmbalagemPainelGroup[] = [];

  for (const [groupKey, groupPedidos] of Object.entries(groups)) {
    const [cliente, dataFab, obs] = groupKey.split('|');
    const naoFinal = sortPorOrdemPlanejamento(
      groupPedidos.filter((pedido) => !isPedidoEmbalagemFinalizado(pedido)),
    );
    const final = sortPorOrdemPlanejamento(
      groupPedidos.filter((pedido) => isPedidoEmbalagemFinalizado(pedido)),
    );

    if (naoFinal.length > 0) {
      gruposNaoFinalizados.push({
        key: groupKey,
        cliente,
        dataFabricacao: dataFab,
        observacao: obs || undefined,
        items: [],
        pedidos: naoFinal,
      });
    }

    if (final.length > 0) {
      gruposFinalizados.push({
        key: groupKey,
        cliente,
        dataFabricacao: dataFab,
        observacao: obs || undefined,
        items: [],
        pedidos: final,
      });
    }
  }

  return {
    gruposNaoFinalizados: sortGruposPorOrdemPlanejamento(gruposNaoFinalizados),
    gruposFinalizados: sortGruposPorOrdemPlanejamento(gruposFinalizados),
  };
}
