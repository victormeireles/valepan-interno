import { getQuantityByStation, Station } from '@/lib/utils/production-conversions';
import type { ProductionQueueItem } from './production-queue-types';

export function parseLatasInputFilaForno(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export function fornoGroupProgressMetrics(orders: ProductionQueueItem[]) {
  if (orders.length === 0) {
    return {
      meta: 0,
      fermentacao: 0,
      forno: 0,
      unidadeCurta: 'un' as const,
      unidadesPorAssadeira: null as number | null,
    };
  }
  const productInfoFor = (item: ProductionQueueItem) => ({
    unidadeNomeResumido: item.produtos.unidadeNomeResumido,
    unidades_assadeira: item.produtos.unidades_assadeira ?? null,
    box_units: item.produtos.box_units ?? null,
    receita_massa: item.produtos.receita_massa ?? null,
  });
  const meta = orders.reduce(
    (s, i) => s + (getQuantityByStation('entrada_forno', i.qtd_planejada, productInfoFor(i)).value || 0),
    0,
  );
  const fermentacao = orders.reduce((s, i) => s + (i.fermentacao_volume_concluido ?? 0), 0);
  const forno = orders.reduce((s, i) => s + (i.forno_entrada_latas_total ?? i.forno_volume_concluido ?? 0), 0);
  const ua = orders[0].produtos.unidades_assadeira;
  const uaOk = ua != null && ua > 0 ? ua : null;
  return {
    meta,
    fermentacao,
    forno,
    unidadeCurta: uaOk != null ? ('LT' as const) : ('un' as const),
    unidadesPorAssadeira: uaOk,
  };
}

export function entradaEmbalagemGroupProgressMetrics(orders: ProductionQueueItem[]) {
  if (orders.length === 0) {
    return {
      meta: 0,
      saidaForno: 0,
      entradaEmbalagem: 0,
      unidadeCurta: 'un' as const,
      unidadesPorAssadeira: null as number | null,
    };
  }
  const productInfoFor = (item: ProductionQueueItem) => ({
    unidadeNomeResumido: item.produtos.unidadeNomeResumido,
    unidades_assadeira: item.produtos.unidades_assadeira ?? null,
    box_units: item.produtos.box_units ?? null,
    receita_massa: item.produtos.receita_massa ?? null,
  });
  const meta = orders.reduce(
    (s, i) => s + (getQuantityByStation('saida_forno', i.qtd_planejada, productInfoFor(i)).value || 0),
    0,
  );
  const saidaForno = orders.reduce((s, i) => s + (i.saida_forno_bandejas_total ?? 0), 0);
  const entradaEmbalagem = orders.reduce((s, i) => s + (i.entrada_embalagem_latas_total ?? 0), 0);
  const ua = orders[0].produtos.unidades_assadeira;
  const uaOk = ua != null && ua > 0 ? ua : null;
  return {
    meta,
    saidaForno,
    entradaEmbalagem,
    unidadeCurta: uaOk != null ? ('LT' as const) : ('un' as const),
    unidadesPorAssadeira: uaOk,
  };
}

export function entradaEmbalagemItemProgressMetrics(item: ProductionQueueItem) {
  const ua = item.produtos.unidades_assadeira;
  const uaOk = ua != null && ua > 0 ? ua : null;
  const productInfo = {
    unidadeNomeResumido: item.produtos.unidadeNomeResumido,
    unidades_assadeira: uaOk,
    box_units: item.produtos.box_units ?? null,
    receita_massa: item.produtos.receita_massa ?? null,
  };
  const meta = getQuantityByStation('saida_forno', item.qtd_planejada, productInfo).value || 0;
  const saidaForno = item.saida_forno_bandejas_total ?? 0;
  const entradaEmbalagem = item.entrada_embalagem_latas_total ?? 0;
  return {
    meta,
    saidaForno,
    entradaEmbalagem,
    unidadeCurta: uaOk != null ? ('LT' as const) : ('un' as const),
    unidadesPorAssadeira: uaOk,
  };
}

export function saidaFornoGroupProgressMetrics(orders: ProductionQueueItem[]) {
  if (orders.length === 0) {
    return {
      meta: 0,
      entradaForno: 0,
      saidaForno: 0,
      unidadeCurta: 'un' as const,
      unidadesPorAssadeira: null as number | null,
    };
  }
  const productInfoFor = (item: ProductionQueueItem) => ({
    unidadeNomeResumido: item.produtos.unidadeNomeResumido,
    unidades_assadeira: item.produtos.unidades_assadeira ?? null,
    box_units: item.produtos.box_units ?? null,
    receita_massa: item.produtos.receita_massa ?? null,
  });
  const meta = orders.reduce(
    (s, i) => s + (getQuantityByStation('saida_forno', i.qtd_planejada, productInfoFor(i)).value || 0),
    0,
  );
  const entradaForno = orders.reduce((s, i) => s + (i.forno_entrada_latas_total ?? 0), 0);
  const saidaForno = orders.reduce((s, i) => s + (i.saida_forno_bandejas_total ?? 0), 0);
  const ua = orders[0].produtos.unidades_assadeira;
  const uaOk = ua != null && ua > 0 ? ua : null;
  return {
    meta,
    entradaForno,
    saidaForno,
    unidadeCurta: uaOk != null ? ('LT' as const) : ('un' as const),
    unidadesPorAssadeira: uaOk,
  };
}

const MASSA_META_EPS = 1e-9;

/** Meta de receitas de massa atingida (mesmo critério da barra de progresso). */
export function massaMetaConcluida(item: ProductionQueueItem): boolean {
  const q = getQuantityByStation('massa', item.qtd_planejada, item.produtos);
  const necessarias = q.receitas?.value || 0;
  const batidas = item.receitas_batidas || 0;
  return necessarias > 0 && batidas + MASSA_META_EPS >= necessarias;
}

export function fermentacaoProgressMetricsForQueueItem(item: ProductionQueueItem) {
  const ua = item.produtos.unidades_assadeira;
  const uaOk = ua != null && ua > 0 ? ua : null;
  const productInfo = {
    unidadeNomeResumido: item.produtos.unidadeNomeResumido,
    unidades_assadeira: uaOk,
    box_units: item.produtos.box_units ?? null,
    receita_massa: item.produtos.receita_massa ?? null,
  };
  const meta = getQuantityByStation('fermentacao', item.qtd_planejada, productInfo).value || 0;
  const rb = item.receitas_batidas || 0;
  const q = item.produtos.receita_massa?.quantidade_por_produto ?? 0;
  const massa = uaOk != null && q > 0 ? (rb * q) / uaOk : q > 0 ? rb * q : 0;
  const fermentacao = item.fermentacao_volume_concluido ?? 0;
  return {
    meta,
    massa,
    fermentacao,
    unidadeCurta: uaOk != null ? ('LT' as const) : ('un' as const),
    unidadesPorAssadeira: uaOk,
  };
}

type QueueRowForSort = ProductionQueueItem & {
  data_producao?: string | null;
  created_at?: string | null;
  ordem_planejamento?: number | null;
};

/** Mesma prioridade que `getProductionQueue` no servidor: ordem_planejamento → data_producao → created_at. */
export function compareProductionQueuePlanningOrder(a: ProductionQueueItem, b: ProductionQueueItem): number {
  const aa = a as QueueRowForSort;
  const bb = b as QueueRowForSort;
  const oa = aa.ordem_planejamento;
  const ob = bb.ordem_planejamento;
  const na = oa == null || Number.isNaN(Number(oa)) ? Number.MAX_SAFE_INTEGER : Number(oa);
  const nb = ob == null || Number.isNaN(Number(ob)) ? Number.MAX_SAFE_INTEGER : Number(ob);
  if (na !== nb) return na - nb;
  const dataA = aa.data_producao ? new Date(aa.data_producao).getTime() : Number.MAX_SAFE_INTEGER;
  const dataB = bb.data_producao ? new Date(bb.data_producao).getTime() : Number.MAX_SAFE_INTEGER;
  if (dataA !== dataB) return dataA - dataB;
  const createdA = aa.created_at ? new Date(aa.created_at).getTime() : 0;
  const createdB = bb.created_at ? new Date(bb.created_at).getTime() : 0;
  return createdA - createdB;
}

/** Posição 1..N fixa por ordem de planejamento (não muda quando a lista é reordenada só para exibição). */
export function planningOrderRankById(queue: ProductionQueueItem[]): Map<string, number> {
  const sorted = [...queue].sort(compareProductionQueuePlanningOrder);
  const m = new Map<string, number>();
  sorted.forEach((item, i) => {
    m.set(item.id, i + 1);
  });
  return m;
}

const PRONTO_EPS = 1e-6;

function productInfoFromQueueItem(item: ProductionQueueItem) {
  return {
    unidadeNomeResumido: item.produtos.unidadeNomeResumido,
    unidades_assadeira: item.produtos.unidades_assadeira ?? null,
    box_units: item.produtos.box_units ?? null,
    receita_massa: item.produtos.receita_massa ?? null,
  };
}

/** Estado visual do card na fila (cor + selo), alinhado a `ordemProntaNaEtapaFila`. */
export type FilaCardEstadoVisual = 'finalizada' | 'em_andamento' | 'proximo' | 'pendente';

/** True se já houve trabalho registrado nesta etapa, mas a meta ainda não foi atingida. */
export function filaItemTemProgressoParcialNaEtapa(item: ProductionQueueItem, station: Station): boolean {
  if (item.produtoJoinFaltando) return false;
  switch (station) {
    case 'planejamento':
      return Boolean(String(item.data_producao ?? '').trim()) || Number(item.qtd_planejada) > 0;
    case 'massa':
      return (item.receitas_batidas ?? 0) >= 0.5;
    case 'fermentacao':
      return (item.receitas_fermentacao ?? 0) > 0 || (item.fermentacao_volume_concluido ?? 0) > 0;
    case 'entrada_forno':
      return (item.forno_entrada_latas_total ?? 0) > 0 || (item.forno_volume_concluido ?? 0) > 0;
    case 'saida_forno':
      return (item.saida_forno_bandejas_total ?? 0) > 0;
    case 'entrada_embalagem':
      return (item.entrada_embalagem_latas_total ?? 0) > 0;
    case 'saida_embalagem':
      return false;
    default:
      return false;
  }
}

/**
 * Card de ordem na fila: finalizada (meta da etapa), em andamento, próximo da fila (ainda sem registro) ou pendente.
 */
export function filaCardEstadoVisual(
  item: ProductionQueueItem,
  station: Station,
  opts: { fromProntosSection: boolean; isFirstActiveInFila: boolean },
): FilaCardEstadoVisual {
  if (item.produtoJoinFaltando) return 'pendente';
  if (opts.fromProntosSection || ordemProntaNaEtapaFila(item, station)) {
    return 'finalizada';
  }
  if (filaItemTemProgressoParcialNaEtapa(item, station)) {
    return 'em_andamento';
  }
  if (opts.isFirstActiveInFila) {
    return 'proximo';
  }
  return 'pendente';
}

export type FilaGrupoProdutoEstadoVisual = 'finalizada' | 'em_andamento' | 'proximo' | 'pendente';

/** Grupo por produto (entrada no forno): barra agregada + posição na lista ativa. */
export function filaGrupoEntradaFornoEstadoVisual(
  orders: ProductionQueueItem[],
  opts: { fromProntosSection: boolean; isFirstActiveGroup: boolean },
): FilaGrupoProdutoEstadoVisual {
  if (orders.some((o) => o.produtoJoinFaltando)) return 'pendente';
  if (opts.fromProntosSection || fornoProductGroupEtapaCompleta(orders)) {
    return 'finalizada';
  }
  const g = fornoGroupProgressMetrics(orders);
  if (g.forno > PRONTO_EPS) return 'em_andamento';
  if (opts.isFirstActiveGroup) return 'proximo';
  return 'pendente';
}

/** Grupo por produto (saída do forno). */
export function filaGrupoSaidaFornoEstadoVisual(
  orders: ProductionQueueItem[],
  opts: { fromProntosSection: boolean; isFirstActiveGroup: boolean },
): FilaGrupoProdutoEstadoVisual {
  if (orders.some((o) => o.produtoJoinFaltando)) return 'pendente';
  if (opts.fromProntosSection || saidaFornoProductGroupEtapaCompleta(orders)) {
    return 'finalizada';
  }
  const g = saidaFornoGroupProgressMetrics(orders);
  if (g.saidaForno > PRONTO_EPS) return 'em_andamento';
  if (opts.isFirstActiveGroup) return 'proximo';
  return 'pendente';
}

/**
 * Indica se a ordem já cumpriu o objetivo da etapa na fila (para separar "prontos" na UI).
 */
export function ordemProntaNaEtapaFila(item: ProductionQueueItem, station: Station): boolean {
  if (item.produtoJoinFaltando) return false;
  switch (station) {
    case 'planejamento':
      return Boolean(String(item.data_producao ?? '').trim()) && Number(item.qtd_planejada) > 0;
    case 'massa':
      return massaMetaConcluida(item);
    case 'fermentacao': {
      const m = fermentacaoProgressMetricsForQueueItem(item);
      return m.meta > 0 && m.fermentacao + PRONTO_EPS >= m.meta;
    }
    case 'entrada_forno': {
      const pi = productInfoFromQueueItem(item);
      const meta = getQuantityByStation('entrada_forno', item.qtd_planejada, pi).value || 0;
      const forno = item.forno_entrada_latas_total ?? item.forno_volume_concluido ?? 0;
      return meta > 0 && forno + PRONTO_EPS >= meta;
    }
    case 'saida_forno': {
      const pi = productInfoFromQueueItem(item);
      const meta = getQuantityByStation('saida_forno', item.qtd_planejada, pi).value || 0;
      const saida = item.saida_forno_bandejas_total ?? 0;
      return meta > 0 && saida + PRONTO_EPS >= meta;
    }
    case 'entrada_embalagem': {
      const m = entradaEmbalagemItemProgressMetrics(item);
      return m.meta > 0 && m.entradaEmbalagem + PRONTO_EPS >= m.meta;
    }
    case 'saida_embalagem':
      return (item.status ?? '').toLowerCase() === 'concluido';
    default:
      return false;
  }
}

export function fornoProductGroupEtapaCompleta(orders: ProductionQueueItem[]): boolean {
  if (orders.length === 0) return false;
  const g = fornoGroupProgressMetrics(orders);
  return g.meta > 0 && g.forno + PRONTO_EPS >= g.meta;
}

export function saidaFornoProductGroupEtapaCompleta(orders: ProductionQueueItem[]): boolean {
  if (orders.length === 0) return false;
  const g = saidaFornoGroupProgressMetrics(orders);
  return g.meta > 0 && g.saidaForno + PRONTO_EPS >= g.meta;
}

/** Título da secção inferior na fila (ordens já concluídas nesta etapa). */
export function filaEtapaTituloSecaoProntos(station: Station): string {
  const m: Record<Station, string> = {
    planejamento: 'Definidos — prontos para produzir',
    massa: 'Meta de massa atingida',
    fermentacao: 'Fermentação completa',
    entrada_forno: 'Entrada no forno completa',
    saida_forno: 'Saída do forno completa',
    entrada_embalagem: 'Entrada na embalagem completa',
    saida_embalagem: 'Ordem concluída',
  };
  return m[station] ?? 'Concluídos nesta etapa';
}

export function getStationInfo(station: Station) {
  const stationMap: Record<Station, { nome: string; icon: string }> = {
    planejamento: { nome: 'Planejamento', icon: 'schedule' },
    massa: { nome: 'Massa', icon: 'blender' },
    fermentacao: { nome: 'Fermentação', icon: 'eco' },
    entrada_forno: { nome: 'Entrada do Forno', icon: 'local_fire_department' },
    saida_forno: { nome: 'Saída do Forno', icon: 'outbox' },
    entrada_embalagem: { nome: 'Entrada da Embalagem', icon: 'inventory_2' },
    saida_embalagem: { nome: 'Saída da Embalagem', icon: 'local_shipping' },
  };
  return stationMap[station];
}
