import {
  getMetaCaixasSaidaEmbalagem,
  getQuantityByStation,
  type ProductConversionInfo,
  Station,
} from '@/lib/utils/production-conversions';
import type { ProductionQueueItem } from './production-queue-types';

/** Produto ausente no BD ou falha ao carregar cadastro na fila. */
export function filaItemProdutoIndisponivel(item: ProductionQueueItem): boolean {
  return Boolean(item.produtoJoinFaltando || item.produtoCargaFilaErro);
}

function productInfoFor(item: ProductionQueueItem): ProductConversionInfo {
  return {
    unidadeNomeResumido: item.produtos.unidadeNomeResumido,
    unidades_assadeira: item.produtos.unidades_assadeira ?? null,
    box_units: item.produtos.box_units ?? null,
    receita_massa: item.produtos.receita_massa ?? null,
  };
}

function unidadesConsumoPlanejadasForItem(item: ProductionQueueItem): number | undefined {
  const u = item.planejado_unidades_consumo;
  return u != null && Number.isFinite(u) && u >= 0 ? u : undefined;
}

function getQtyByStation(item: ProductionQueueItem, station: Station) {
  return getQuantityByStation(
    station,
    item.qtd_planejada,
    productInfoFor(item),
    unidadesConsumoPlanejadasForItem(item),
  );
}

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
  const meta = orders.reduce((s, i) => s + (getQtyByStation(i, 'entrada_forno').value || 0), 0);
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
  const meta = orders.reduce((s, i) => s + (getQtyByStation(i, 'saida_forno').value || 0), 0);
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
  const meta = getQtyByStation(item, 'saida_forno').value || 0;
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
  const meta = orders.reduce((s, i) => s + (getQtyByStation(i, 'saida_forno').value || 0), 0);
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

/** Receitas de massa necessárias para a ordem (meta da barra de progresso da massa). */
export function massaReceitasNecessarias(item: ProductionQueueItem): number {
  return getQtyByStation(item, 'massa').receitas?.value || 0;
}

/** Meta da ordem em LT (meta da fermentação) — usada para calcular o saldo «Início» ao adiantar. */
export function fermentacaoMetaLt(item: ProductionQueueItem): number {
  return getQtyByStation(item, 'fermentacao').value || 0;
}

/** Meta de receitas de massa atingida (mesmo critério da barra de progresso). */
export function massaMetaConcluida(item: ProductionQueueItem): boolean {
  const necessarias = massaReceitasNecessarias(item);
  const batidas = item.receitas_batidas || 0;
  return necessarias > 0 && batidas + MASSA_META_EPS >= necessarias;
}

export function fermentacaoProgressMetricsForQueueItem(item: ProductionQueueItem) {
  const ua = item.produtos.unidades_assadeira;
  const uaOk = ua != null && ua > 0 ? ua : null;
  const meta = getQtyByStation(item, 'fermentacao').value || 0;
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

function productInfoFromQueueItem(item: ProductionQueueItem): ProductConversionInfo {
  return {
    unidadeNomeResumido: item.produtos.unidadeNomeResumido,
    package_units: item.produtos.package_units ?? null,
    unidades_assadeira: item.produtos.unidades_assadeira ?? null,
    box_units: item.produtos.box_units ?? null,
    unidades_lata_antiga: item.produtos.unidades_lata_antiga ?? null,
    unidades_lata_nova: item.produtos.unidades_lata_nova ?? null,
    receita_massa: item.produtos.receita_massa ?? null,
  };
}

/** Métricas por ordem na fila de saída de embalagem (caixas vs referência + lotes na entrada da embalagem). */
export function saidaEmbalagemItemProgressMetrics(item: ProductionQueueItem) {
  const pi = productInfoFromQueueItem(item);
  const metaBlock = getMetaCaixasSaidaEmbalagem(item.qtd_planejada, pi);

  // Prioriza as caixas planejadas da ordem (conversão correta com tipo de caixa);
  // só cai no cálculo por box_units do produto quando a OP não tem esse valor.
  const caixasPlanejadas = item.caixas_planejadas;
  const usarCaixasPlanejadas =
    caixasPlanejadas != null && Number.isFinite(caixasPlanejadas) && caixasPlanejadas > 0;

  return {
    metaCaixas: usarCaixasPlanejadas ? caixasPlanejadas : metaBlock.caixasEsperadas,
    metaResumo: usarCaixasPlanejadas ? `${caixasPlanejadas} cx` : metaBlock.resumo,
    metaSubtexto: usarCaixasPlanejadas
      ? 'Caixas planejadas na ordem (conversão do planejamento, considerando o tipo de caixa).'
      : metaBlock.subtexto,
    caixasInformadas: item.saida_embalagem_caixas_informadas ?? null,
    lotesEntrada: item.entrada_embalagem_registros_count ?? 0,
  };
}

/** Soma nas ordens da fila atual (respeita filtro de data da página quando aplicado). */
export function saidaEmbalagemFilaGlobalMetrics(orders: ProductionQueueItem[]) {
  let metaSoma = 0;
  let cxSoma = 0;
  let lotesEntrada = 0;
  for (const o of orders) {
    if (filaItemProdutoIndisponivel(o)) continue;
    const m = saidaEmbalagemItemProgressMetrics(o);
    if (m.metaCaixas != null && Number.isFinite(m.metaCaixas)) {
      metaSoma += m.metaCaixas;
    }
    if (m.caixasInformadas != null && Number.isFinite(m.caixasInformadas)) {
      cxSoma += m.caixasInformadas;
    }
    lotesEntrada += m.lotesEntrada;
  }
  return { metaCaixasSoma: metaSoma, caixasInformadasSoma: cxSoma, lotesEntradaTotal: lotesEntrada };
}

/** Estado visual do card na fila (cor + selo), alinhado a `ordemProntaNaEtapaFila`. */
export type FilaCardEstadoVisual =
  | 'finalizada'
  | 'em_andamento'
  | 'proximo'
  | 'pendente'
  | 'aguardando_etapa_anterior';

/**
 * Pré-requisitos mínimos que antes filtravam a fila (só aparecia quem tinha concluído a etapa anterior).
 * Com a fila completa visível, usamos isto para selos, ordem dos cards e desativar ações indevidas.
 */
export function ordemPreRequisitosAtendidosParaTrabalharNaEtapa(
  item: ProductionQueueItem,
  station: Station,
): boolean {
  if (filaItemProdutoIndisponivel(item)) return false;
  switch (station) {
    case 'massa':
      return true;
    case 'fermentacao':
      return (item.qtd_massa_finalizada ?? 0) > 0;
    case 'entrada_forno':
      return (item.receitas_fermentacao ?? 0) > 0;
    case 'saida_forno':
      return (item.forno_entrada_latas_total ?? 0) > 0;
    case 'entrada_embalagem':
      return (item.saida_forno_bandejas_total ?? 0) > 0;
    case 'saida_embalagem':
      return (
        (item.entrada_embalagem_latas_total ?? 0) > 0 ||
        (item.entrada_embalagem_registros_count ?? 0) > 0
      );
    default:
      return true;
  }
}

/** True quando faltam registros nas etapas anteriores — mostrar «Confirmar etapas» na fila. */
export function ordemFaltaPreRequisitosNaEtapaFila(
  item: ProductionQueueItem,
  station: Station,
): boolean {
  if (filaItemProdutoIndisponivel(item)) return false;
  return !ordemPreRequisitosAtendidosParaTrabalharNaEtapa(item, station);
}

/** Mostrar botão Confirmar/Adiantar etapas no card (pré-requisitos ou meta da etapa ainda não atingida). */
export function ordemMostrarConfirmarEtapasNaFila(
  item: ProductionQueueItem,
  station: Station,
): boolean {
  if (filaItemProdutoIndisponivel(item)) return false;
  if (ordemFaltaPreRequisitosNaEtapaFila(item, station)) return true;
  switch (station) {
    case 'entrada_forno': {
      const meta = getQtyByStation(item, 'entrada_forno').value || 0;
      const forno = item.forno_entrada_latas_total ?? item.forno_volume_concluido ?? 0;
      return meta > 0 && forno + PRONTO_EPS < meta;
    }
    case 'saida_forno': {
      const meta = getQtyByStation(item, 'saida_forno').value || 0;
      const saida = item.saida_forno_bandejas_total ?? 0;
      return meta > 0 && saida + PRONTO_EPS < meta;
    }
    case 'entrada_embalagem': {
      // «Adiantar etapas» cria carrinhos na saída do forno (pré-requisito desta etapa).
      // Quando a saída do forno já cobre a meta, não há mais nada para adiantar — só registrar a entrada.
      const m = entradaEmbalagemItemProgressMetrics(item);
      return m.meta > 0 && m.saidaForno + PRONTO_EPS < m.meta;
    }
    case 'saida_embalagem': {
      const se = saidaEmbalagemItemProgressMetrics(item);
      if (se.metaCaixas != null && se.metaCaixas > 0) {
        const cx = se.caixasInformadas ?? 0;
        return cx + PRONTO_EPS < se.metaCaixas;
      }
      return false;
    }
    default:
      return false;
  }
}

/** Adiantar como atalho secundário (há ação principal da etapa); Confirmar mantém destaque quando faltam pré-requisitos. */
export function ordemAdiantarEtapasComoSecundarioNaFila(
  item: ProductionQueueItem,
  station: Station,
): boolean {
  return (
    ordemMostrarConfirmarEtapasNaFila(item, station) &&
    !ordemFaltaPreRequisitosNaEtapaFila(item, station)
  );
}

export function labelConfirmarEtapasNaFila(_item: ProductionQueueItem, _station: Station): string {
  // Rótulo unificado: o botão abre sempre o mesmo fluxo de adiantar/sincronizar etapas,
  // independentemente de faltarem pré-requisitos, então usamos um único texto.
  return 'Adiantar etapas';
}

/** Texto para tooltip / título quando a ordem aparece na etapa mas ainda não pode ser avançada aqui. */
export function filaMensagemPreRequisitoEtapaAnterior(
  station: Station,
): string | null {
  switch (station) {
    case 'fermentacao':
      return 'Conclua o registro de massa antes de iniciar a fermentação.';
    case 'entrada_forno':
      return 'É necessário registro na fermentação (carrinhos com latas) antes da entrada no forno.';
    case 'saida_forno':
      return 'Registre entrada no forno antes da saída do forno.';
    case 'entrada_embalagem':
      return 'Registre a saída do forno antes da entrada na embalagem. Se a massa já foi batida mas as etapas intermédias não foram lançadas no sistema, use Adiantar etapas no card da ordem.';
    case 'saida_embalagem':
      return 'Registre entrada na embalagem antes da saída de embalagem.';
    default:
      return null;
  }
}

/** True se já houve trabalho registrado nesta etapa, mas a meta ainda não foi atingida. */
export function filaItemTemProgressoParcialNaEtapa(item: ProductionQueueItem, station: Station): boolean {
  if (filaItemProdutoIndisponivel(item)) return false;
  switch (station) {
    case 'massa':
      return (item.receitas_batidas ?? 0) >= 0.5;
    case 'fermentacao':
      return (item.receitas_fermentacao ?? 0) > 0 || (item.fermentacao_volume_concluido ?? 0) > 0;
    case 'entrada_forno':
      return (item.forno_entrada_latas_total ?? 0) > 0 || (item.forno_volume_concluido ?? 0) > 0;
    case 'saida_forno':
      return (item.saida_forno_bandejas_total ?? 0) > 0;
    case 'entrada_embalagem':
      return (
        (item.entrada_embalagem_latas_total ?? 0) > 0 ||
        (item.receitas_batidas ?? 0) > 0 ||
        (item.qtd_massa_finalizada ?? 0) > 0
      );
    case 'saida_embalagem':
      return (item.saida_embalagem_caixas_informadas ?? 0) > 0;
    default:
      return false;
  }
}

/**
 * Card de ordem na fila: finalizada (meta da etapa), em andamento, próximo (primeiro acionável),
 * aguardando etapa anterior, ou pendente.
 */
export function filaCardEstadoVisual(
  item: ProductionQueueItem,
  station: Station,
  opts: { fromProntosSection: boolean; isFirstActionableInFila: boolean },
): FilaCardEstadoVisual {
  if (filaItemProdutoIndisponivel(item)) return 'pendente';
  if (opts.fromProntosSection || ordemProntaNaEtapaFila(item, station)) {
    return 'finalizada';
  }
  if (!ordemPreRequisitosAtendidosParaTrabalharNaEtapa(item, station)) {
    if (filaItemTemProgressoParcialNaEtapa(item, station)) {
      return 'em_andamento';
    }
    return 'aguardando_etapa_anterior';
  }
  if (filaItemTemProgressoParcialNaEtapa(item, station)) {
    return 'em_andamento';
  }
  if (opts.isFirstActionableInFila) {
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
  if (orders.some((o) => filaItemProdutoIndisponivel(o))) return 'pendente';
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
  if (orders.some((o) => filaItemProdutoIndisponivel(o))) return 'pendente';
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
  if (filaItemProdutoIndisponivel(item)) return false;
  switch (station) {
    case 'massa':
      return massaMetaConcluida(item);
    case 'fermentacao': {
      const m = fermentacaoProgressMetricsForQueueItem(item);
      return m.meta > 0 && m.fermentacao + PRONTO_EPS >= m.meta;
    }
    case 'entrada_forno': {
      const meta = getQtyByStation(item, 'entrada_forno').value || 0;
      const forno = item.forno_entrada_latas_total ?? item.forno_volume_concluido ?? 0;
      return meta > 0 && forno + PRONTO_EPS >= meta;
    }
    case 'saida_forno': {
      const meta = getQtyByStation(item, 'saida_forno').value || 0;
      const saida = item.saida_forno_bandejas_total ?? 0;
      return meta > 0 && saida + PRONTO_EPS >= meta;
    }
    case 'entrada_embalagem': {
      const m = entradaEmbalagemItemProgressMetrics(item);
      return m.meta > 0 && m.entradaEmbalagem + PRONTO_EPS >= m.meta;
    }
    case 'saida_embalagem':
      return (
        (item.saida_embalagem_caixas_informadas ?? 0) > 0 ||
        (item.saida_embalagem_registros?.length ?? 0) > 0
      );
    default:
      return false;
  }
}

/** Ordem do pipeline de produção (1 segmento da barra macro por etapa). */
const FILA_OP_PIPELINE_STATIONS: Station[] = [
  'massa',
  'fermentacao',
  'entrada_forno',
  'saida_forno',
  'entrada_embalagem',
  'saida_embalagem',
];

function filaEtapaFillRatioForOp(item: ProductionQueueItem, station: Station): number {
  switch (station) {
    case 'massa': {
      const nec = getQtyByStation(item, 'massa').receitas?.value ?? 0;
      if (nec <= 0) return 0;
      return Math.min(1, (item.receitas_batidas ?? 0) / nec);
    }
    case 'fermentacao': {
      const m = fermentacaoProgressMetricsForQueueItem(item);
      if (m.meta <= 0) return 0;
      return Math.min(1, m.fermentacao / m.meta);
    }
    case 'entrada_forno': {
      const meta = getQtyByStation(item, 'entrada_forno').value || 0;
      if (meta <= 0) return 0;
      const v = item.forno_entrada_latas_total ?? item.forno_volume_concluido ?? 0;
      return Math.min(1, v / meta);
    }
    case 'saida_forno': {
      const meta = getQtyByStation(item, 'saida_forno').value || 0;
      if (meta <= 0) return 0;
      const v = item.saida_forno_bandejas_total ?? 0;
      return Math.min(1, v / meta);
    }
    case 'entrada_embalagem': {
      const m = entradaEmbalagemItemProgressMetrics(item);
      if (m.meta <= 0) return 0;
      return Math.min(1, m.entradaEmbalagem / m.meta);
    }
    case 'saida_embalagem': {
      const se = saidaEmbalagemItemProgressMetrics(item);
      if (se.metaCaixas != null && se.metaCaixas > 0 && se.caixasInformadas != null) {
        return Math.min(1, se.caixasInformadas / se.metaCaixas);
      }
      return 0;
    }
    default:
      return 0;
  }
}

/**
 * Progresso 0–100% da OP ao longo do pipeline (massa → … → saída embalagem):
 * etapas concluídas somam segmentos iguais; na primeira incompleta aplica-se só a fração atual.
 */
export function filaOrdemProducaoProgressoSequencialPct(item: ProductionQueueItem): number {
  if (filaItemProdutoIndisponivel(item)) return 0;
  if (String(item.status ?? '').toLowerCase() === 'concluido') return 100;

  const seg = 100 / FILA_OP_PIPELINE_STATIONS.length;
  let total = 0;
  for (const st of FILA_OP_PIPELINE_STATIONS) {
    if (ordemProntaNaEtapaFila(item, st)) {
      total += seg;
      continue;
    }
    const r = filaEtapaFillRatioForOp(item, st);
    total += seg * Math.max(0, Math.min(1, r));
    break;
  }
  return Math.min(100, Math.round(total));
}

/** Média do progresso macro das ordens do grupo (cabeçalho compacto por produto). */
export function filaOrdemProducaoGrupoProgressoPct(orders: ProductionQueueItem[]): number {
  const ok = orders.filter((o) => !filaItemProdutoIndisponivel(o));
  if (ok.length === 0) return 0;
  const sum = ok.reduce((acc, o) => acc + filaOrdemProducaoProgressoSequencialPct(o), 0);
  return Math.round(sum / ok.length);
}

/**
 * Progresso 0–100% relativo à PRÓPRIA etapa (não ao pipeline inteiro):
 * ex.: na entrada do forno mostra o que já entrou no forno / meta — vazio se nada foi colocado.
 */
export function filaEtapaProgressoRelativoPct(item: ProductionQueueItem, station: Station): number {
  if (filaItemProdutoIndisponivel(item)) return 0;
  const r = Math.max(0, Math.min(1, filaEtapaFillRatioForOp(item, station)));
  return Math.round(r * 100);
}

/** Versão por grupo (entrada/saída do forno): soma dos volumes da etapa ÷ soma das metas. */
export function filaEtapaGrupoProgressoRelativoPct(
  orders: ProductionQueueItem[],
  station: Station,
): number {
  const ok = orders.filter((o) => !filaItemProdutoIndisponivel(o));
  if (ok.length === 0) return 0;
  if (station === 'entrada_forno') {
    const g = fornoGroupProgressMetrics(ok);
    return g.meta > 0 ? Math.round(Math.min(100, (g.forno / g.meta) * 100)) : 0;
  }
  if (station === 'saida_forno') {
    const g = saidaFornoGroupProgressMetrics(ok);
    return g.meta > 0 ? Math.round(Math.min(100, (g.saidaForno / g.meta) * 100)) : 0;
  }
  const sum = ok.reduce(
    (acc, o) => acc + Math.max(0, Math.min(1, filaEtapaFillRatioForOp(o, station))),
    0,
  );
  return Math.round((sum / ok.length) * 100);
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
    massa: 'Meta de massa atingida',
    fermentacao: 'Fermentação completa',
    entrada_forno: 'Entrada no forno completa',
    saida_forno: 'Saída do forno completa',
    entrada_embalagem: 'Entrada na embalagem completa',
    saida_embalagem: 'Saída registada — expanda para editar ou excluir caixas',
  };
  return m[station] ?? 'Concluídos nesta etapa';
}

export function getStationInfo(station: Station) {
  const stationMap: Record<Station, { nome: string; icon: string }> = {
    massa: { nome: 'Massa', icon: 'blender' },
    fermentacao: { nome: 'Fermentação', icon: 'eco' },
    entrada_forno: { nome: 'Entrada do Forno', icon: 'local_fire_department' },
    saida_forno: { nome: 'Saída do Forno', icon: 'outbox' },
    entrada_embalagem: { nome: 'Entrada da Embalagem', icon: 'inventory_2' },
    saida_embalagem: { nome: 'Saída de embalagem', icon: 'assignment_turned_in' },
  };
  return stationMap[station];
}
