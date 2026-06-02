import { useMemo } from 'react';
import type { Station } from '@/lib/utils/production-conversions';
import type { CarrinhoFilaForno, ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import {
  compareProductionQueuePlanningOrder,
  entradaEmbalagemGroupProgressMetrics,
  fornoGroupProgressMetrics,
  fornoProductGroupEtapaCompleta,
  ordemPreRequisitosAtendidosParaTrabalharNaEtapa,
  ordemProntaNaEtapaFila,
  saidaEmbalagemFilaGlobalMetrics,
  saidaFornoGroupProgressMetrics,
  saidaFornoProductGroupEtapaCompleta,
} from '@/components/Producao/queue/production-queue-metrics';

export interface ProductionQueueStationFlags {
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
    isMassa,
    isFermentacao,
    isEntradaForno,
    isSaidaForno,
    isEntradaEmbalagem,
    isSaidaEmbalagem,
  }: ProductionQueueStationFlags = {
    isMassa: effectiveStation === 'massa',
    isFermentacao: effectiveStation === 'fermentacao',
    isEntradaForno: effectiveStation === 'entrada_forno',
    isSaidaForno: effectiveStation === 'saida_forno',
    isEntradaEmbalagem: effectiveStation === 'entrada_embalagem',
    isSaidaEmbalagem: effectiveStation === 'saida_embalagem',
  };

  const ordensComProdutoFaltando = useMemo(
    () => initialQueue.filter((i) => i.produtoJoinFaltando && !i.produtoCargaFilaErro).length,
    [initialQueue],
  );
  const ordensComCargaProdutoFalhou = useMemo(
    () => initialQueue.filter((i) => i.produtoCargaFilaErro).length,
    [initialQueue],
  );

  /** Todas as ordens do dia (ou sem filtro de data) visíveis em cada estação — pré-requisitos só afetam selo e botões. */
  const filteredQueue = useMemo(() => initialQueue, [initialQueue]);

  const queueForCardsActive = useMemo(() => {
    const active = [...filteredQueue].filter((i) => !ordemProntaNaEtapaFila(i, effectiveStation));
    return active.sort((a, b) => {
      const pa = ordemPreRequisitosAtendidosParaTrabalharNaEtapa(a, effectiveStation);
      const pb = ordemPreRequisitosAtendidosParaTrabalharNaEtapa(b, effectiveStation);
      if (pa !== pb) return pa ? -1 : 1;
      return compareProductionQueuePlanningOrder(a, b);
    });
  }, [filteredQueue, effectiveStation]);

  const primeiraOrdemAcionavelId = useMemo(() => {
    const found = queueForCardsActive.find((i) =>
      ordemPreRequisitosAtendidosParaTrabalharNaEtapa(i, effectiveStation),
    );
    return found?.id ?? null;
  }, [queueForCardsActive, effectiveStation]);

  const queueForCardsProntos = useMemo(() => {
    return [...filteredQueue]
      .filter((i) => ordemProntaNaEtapaFila(i, effectiveStation))
      .sort(compareProductionQueuePlanningOrder);
  }, [filteredQueue, effectiveStation]);

  const fornoGroups = useMemo(() => {
    if (!isEntradaForno) return [];
    // Um card por ordem de produção (sem agrupar por produto), na ordem de planejamento —
    // igual à fermentação. `produto_id` aqui é a chave do card (= id da OP), só para key/expansão.
    return [...filteredQueue]
      .sort(compareProductionQueuePlanningOrder)
      .map((it) => ({ produto_id: it.id, orders: [it] }));
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

  const saidaEmbalagemFilaGlobal = useMemo(() => {
    if (!isSaidaEmbalagem || filteredQueue.length === 0) return null;
    return saidaEmbalagemFilaGlobalMetrics(filteredQueue);
  }, [isSaidaEmbalagem, filteredQueue]);

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
      isMassa,
      isFermentacao,
      isEntradaForno,
      isSaidaForno,
      isEntradaEmbalagem,
      isSaidaEmbalagem,
    },
    ordensComProdutoFaltando,
    ordensComCargaProdutoFalhou,
    filteredQueue,
    queueForCardsActive,
    primeiraOrdemAcionavelId,
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
    saidaEmbalagemFilaGlobal,
  };
}
