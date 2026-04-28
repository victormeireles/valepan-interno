import { useMemo } from 'react';
import type { Station } from '@/lib/utils/production-conversions';
import type { CarrinhoFilaForno, ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import {
  compareProductionQueuePlanningOrder,
  entradaEmbalagemGroupProgressMetrics,
  fornoGroupProgressMetrics,
  fornoProductGroupEtapaCompleta,
  ordemProntaNaEtapaFila,
  saidaFornoGroupProgressMetrics,
  saidaFornoProductGroupEtapaCompleta,
} from '@/components/Producao/queue/production-queue-metrics';

export interface ProductionQueueStationFlags {
  isPlanning: boolean;
  isMassa: boolean;
  isFermentacao: boolean;
  isEntradaForno: boolean;
  isSaidaForno: boolean;
  isEntradaEmbalagem: boolean;
  isSaidaEmbalagem: boolean;
}

export function useProductionQueueDerived(
  initialQueue: ProductionQueueItem[],
  effectiveStation: Station,
) {
  const {
    isPlanning,
    isMassa,
    isFermentacao,
    isEntradaForno,
    isSaidaForno,
    isEntradaEmbalagem,
    isSaidaEmbalagem,
  }: ProductionQueueStationFlags = {
    isPlanning: effectiveStation === 'planejamento',
    isMassa: effectiveStation === 'massa',
    isFermentacao: effectiveStation === 'fermentacao',
    isEntradaForno: effectiveStation === 'entrada_forno',
    isSaidaForno: effectiveStation === 'saida_forno',
    isEntradaEmbalagem: effectiveStation === 'entrada_embalagem',
    isSaidaEmbalagem: effectiveStation === 'saida_embalagem',
  };

  const ordensComProdutoFaltando = useMemo(
    () => initialQueue.filter((i) => i.produtoJoinFaltando).length,
    [initialQueue],
  );

  const filteredQueue = useMemo(() => {
    if (isFermentacao) {
      return initialQueue.filter((item) => {
        const qtdMassaFinalizada = item.qtd_massa_finalizada ?? 0;
        return qtdMassaFinalizada > 0;
      });
    }
    if (isEntradaForno) {
      return initialQueue.filter((item) => (item.receitas_fermentacao ?? 0) > 0);
    }
    if (isSaidaForno) {
      return initialQueue.filter((item) => (item.forno_entrada_latas_total ?? 0) > 0);
    }
    if (isEntradaEmbalagem || isSaidaEmbalagem) {
      return initialQueue.filter((item) => (item.saida_forno_bandejas_total ?? 0) > 0);
    }
    return initialQueue;
  }, [
    initialQueue,
    isFermentacao,
    isEntradaForno,
    isSaidaForno,
    isEntradaEmbalagem,
    isSaidaEmbalagem,
  ]);

  const queueForCardsActive = useMemo(() => {
    return [...filteredQueue]
      .filter((i) => !ordemProntaNaEtapaFila(i, effectiveStation))
      .sort(compareProductionQueuePlanningOrder);
  }, [filteredQueue, effectiveStation]);

  const queueForCardsProntos = useMemo(() => {
    return [...filteredQueue]
      .filter((i) => ordemProntaNaEtapaFila(i, effectiveStation))
      .sort(compareProductionQueuePlanningOrder);
  }, [filteredQueue, effectiveStation]);

  const fornoGroups = useMemo(() => {
    if (!isEntradaForno) return [];
    const m = new Map<string, ProductionQueueItem[]>();
    for (const it of filteredQueue) {
      if (!m.has(it.produto_id)) m.set(it.produto_id, []);
      m.get(it.produto_id)!.push(it);
    }
    return [...m.entries()]
      .map(([produto_id, orders]) => ({ produto_id, orders }))
      .sort((a, b) => a.orders[0].produtos.nome.localeCompare(b.orders[0].produtos.nome, 'pt-BR'));
  }, [filteredQueue, isEntradaForno]);

  const fornoFilaGlobal = useMemo(() => {
    if (!isEntradaForno) return null;
    return fornoGroupProgressMetrics(filteredQueue);
  }, [isEntradaForno, filteredQueue]);

  const fornoUaHomogenea = useMemo(() => {
    if (!isEntradaForno || filteredQueue.length === 0) return null;
    const uas = [
      ...new Set(
        filteredQueue
          .map((i) => i.produtos.unidades_assadeira)
          .filter((u): u is number => u != null && Number(u) > 0)
          .map((u) => Number(u)),
      ),
    ];
    return uas.length === 1 ? uas[0]! : null;
  }, [isEntradaForno, filteredQueue]);

  const carrinhosParaModalForno = useMemo(() => {
    if (!isEntradaForno) return [];
    const out: CarrinhoFilaForno[] = [];
    const seen = new Set<string>();
    for (const item of filteredQueue) {
      if (item.produtoJoinFaltando) continue;
      const ua = item.produtos.unidades_assadeira;
      const uaOk = ua != null && Number(ua) > 0 ? Number(ua) : null;
      for (const c of item.carrinhos_disponiveis_forno ?? []) {
        if (seen.has(c.log_id)) continue;
        seen.add(c.log_id);
        out.push({
          log_id: c.log_id,
          carrinho: c.carrinho,
          em_fermentacao: c.em_fermentacao,
          latas_registradas: c.latas_registradas,
          ordenacao_fermentacao_ms: c.ordenacao_fermentacao_ms,
          ordem_producao_id: item.id,
          lote_codigo: item.lote_codigo,
          produto_nome: item.produtos.nome,
          unidades_assadeira: uaOk,
          pode_colocar_no_forno: c.latas_registradas > 0,
        });
      }
    }
    return out.sort((a, b) => {
      const d = a.ordenacao_fermentacao_ms - b.ordenacao_fermentacao_ms;
      if (d !== 0) return d;
      return a.carrinho.localeCompare(b.carrinho, 'pt-BR', { numeric: true, sensitivity: 'base' });
    });
  }, [isEntradaForno, filteredQueue]);

  const saidaFilaGlobal = useMemo(() => {
    if (!isSaidaForno) return null;
    return saidaFornoGroupProgressMetrics(filteredQueue);
  }, [isSaidaForno, filteredQueue]);

  const saidaUaHomogenea = useMemo(() => {
    if (!isSaidaForno || filteredQueue.length === 0) return null;
    const uas = [
      ...new Set(
        filteredQueue
          .map((i) => i.produtos.unidades_assadeira)
          .filter((u): u is number => u != null && Number(u) > 0)
          .map((u) => Number(u)),
      ),
    ];
    return uas.length === 1 ? uas[0]! : null;
  }, [isSaidaForno, filteredQueue]);

  const saidaFornoGroups = useMemo(() => {
    if (!isSaidaForno) return [];
    const m = new Map<string, ProductionQueueItem[]>();
    for (const it of filteredQueue) {
      if (!m.has(it.produto_id)) m.set(it.produto_id, []);
      m.get(it.produto_id)!.push(it);
    }
    return [...m.entries()]
      .map(([produto_id, orders]) => ({ produto_id, orders }))
      .sort((a, b) => a.orders[0].produtos.nome.localeCompare(b.orders[0].produtos.nome, 'pt-BR'));
  }, [filteredQueue, isSaidaForno]);

  const fornoGroupsActive = useMemo(
    () => fornoGroups.filter((g) => !fornoProductGroupEtapaCompleta(g.orders)),
    [fornoGroups],
  );
  const fornoGroupsProntos = useMemo(
    () => fornoGroups.filter((g) => fornoProductGroupEtapaCompleta(g.orders)),
    [fornoGroups],
  );

  const saidaFornoGroupsActive = useMemo(
    () => saidaFornoGroups.filter((g) => !saidaFornoProductGroupEtapaCompleta(g.orders)),
    [saidaFornoGroups],
  );
  const saidaFornoGroupsProntos = useMemo(
    () => saidaFornoGroups.filter((g) => saidaFornoProductGroupEtapaCompleta(g.orders)),
    [saidaFornoGroups],
  );

  const embalagemEntradaFilaGlobal = useMemo(() => {
    if (!isEntradaEmbalagem) return null;
    return entradaEmbalagemGroupProgressMetrics(filteredQueue);
  }, [isEntradaEmbalagem, filteredQueue]);

  const embalagemEntradaUaHomogenea = useMemo(() => {
    if (!isEntradaEmbalagem || filteredQueue.length === 0) return null;
    const uas = [
      ...new Set(
        filteredQueue
          .map((i) => i.produtos.unidades_assadeira)
          .filter((u): u is number => u != null && Number(u) > 0)
          .map((u) => Number(u)),
      ),
    ];
    return uas.length === 1 ? uas[0]! : null;
  }, [isEntradaEmbalagem, filteredQueue]);

  return {
    flags: {
      isPlanning,
      isMassa,
      isFermentacao,
      isEntradaForno,
      isSaidaForno,
      isEntradaEmbalagem,
      isSaidaEmbalagem,
    },
    ordensComProdutoFaltando,
    filteredQueue,
    queueForCardsActive,
    queueForCardsProntos,
    fornoGroupsActive,
    fornoGroupsProntos,
    fornoFilaGlobal,
    fornoUaHomogenea,
    carrinhosParaModalForno,
    saidaFilaGlobal,
    saidaUaHomogenea,
    saidaFornoGroupsActive,
    saidaFornoGroupsProntos,
    embalagemEntradaFilaGlobal,
    embalagemEntradaUaHomogenea,
  };
}
