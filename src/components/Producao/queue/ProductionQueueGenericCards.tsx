'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductionProgressBar from '@/components/Producao/ProductionProgressBar';
import FermentacaoProgressoBar from '@/components/Producao/FermentacaoProgressoBar';
import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import {
  entradaEmbalagemItemProgressMetrics,
  fermentacaoProgressMetricsForQueueItem,
  planningOrderRankById,
} from '@/components/Producao/queue/production-queue-metrics';
import { formatIsoDateToDDMMYYYY } from '@/lib/utils/date-utils';
import { getQuantityByStation, type Station } from '@/lib/utils/production-conversions';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';
import type { ProductionQueueStationFlags } from '@/hooks/useProductionQueueDerived';

interface Props {
  queueForCardsActive: ProductionQueueItem[];
  queueForCardsProntos: ProductionQueueItem[];
  /** Título da secção inferior (meta/etapa já concluída nesta fila). */
  tituloSecaoProntos: string;
  /** Mesmo conjunto filtrado da estação, na ordem de planejamento do servidor — usado só para o badge X/Y (fixo). */
  queueForPlanningOrder: ProductionQueueItem[];
  effectiveStation: Station;
  flags: ProductionQueueStationFlags;
  router: { push: (href: string) => void };
  onOpenMassaLotes: (item: ProductionQueueItem) => void;
  /** Na fermentação: abre modal (carrinho + assadeiras) em vez de ir à página da ordem. */
  onOpenFermentacaoModal?: (item: ProductionQueueItem) => void;
}

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1 rounded-lg font-semibold shadow-sm border transition-all whitespace-nowrap px-2.5 py-1.5 text-[11px] leading-tight min-h-[40px] sm:gap-2 sm:rounded-xl sm:px-5 sm:py-3 sm:text-base sm:leading-normal sm:min-h-[52px]';
const BTN_PRIMARY_ICON = 'material-icons text-[18px] leading-none sm:text-[26px]';

const MASSA_METRIC_LABEL = 'text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]';
const MASSA_METRIC_VALUE =
  'mt-0.5 text-[11px] font-semibold tabular-nums leading-tight break-words sm:text-sm';

const NAME_BTN_EXPANDED =
  'min-w-0 flex-1 text-left text-xs font-bold leading-tight text-gray-900 transition-colors hover:text-blue-600 sm:text-base sm:leading-snug md:text-lg cursor-pointer';

function isOrdemStatusConcluida(status: string | null | undefined): boolean {
  return typeof status === 'string' && status.toLowerCase() === 'concluido';
}

export default function ProductionQueueGenericCards({
  queueForCardsActive,
  queueForCardsProntos,
  tituloSecaoProntos,
  queueForPlanningOrder,
  effectiveStation,
  flags,
  router,
  onOpenMassaLotes,
  onOpenFermentacaoModal,
}: Props) {
  const [expandedOrdemId, setExpandedOrdemId] = useState<string | null>(null);

  const toggleExpandOrdem = (id: string) => {
    setExpandedOrdemId((prev) => (prev === id ? null : id));
  };

  const todasOrdensCards = useMemo(
    () => [...queueForCardsActive, ...queueForCardsProntos],
    [queueForCardsActive, queueForCardsProntos],
  );

  useEffect(() => {
    if (expandedOrdemId && !todasOrdensCards.some((q) => q.id === expandedOrdemId)) {
      setExpandedOrdemId(null);
    }
  }, [todasOrdensCards, expandedOrdemId]);

  const posicaoPorPlanejamento = useMemo(
    () => planningOrderRankById(queueForPlanningOrder),
    [queueForPlanningOrder],
  );
  const totalOrdensNaFila = queueForPlanningOrder.length;

  const {
    isPlanning,
    isMassa,
    isFermentacao,
    isEntradaForno,
    isSaidaForno,
    isEntradaEmbalagem,
    isSaidaEmbalagem,
  } = flags;

  const formatDay = (dateString?: string | null) => {
    if (!dateString) return null;
    return formatIsoDateToDDMMYYYY(dateString) || null;
  };

  const renderOrdemCard = (item: ProductionQueueItem, index: number) => {
        const posicaoNaFila = posicaoPorPlanejamento.get(item.id) ?? index + 1;
        const totalNaFila = totalOrdensNaFila;

        const quantidadeParaCalculo = item.qtd_planejada;
        const quantityInfo = getQuantityByStation(effectiveStation, quantidadeParaCalculo, item.produtos);
        const headerQuantityReadable = isEntradaEmbalagem
          ? getQuantityByStation('saida_forno', quantidadeParaCalculo, item.produtos).readable
          : quantityInfo.readable;
        const embalagemEntradaProgress =
          isEntradaEmbalagem && !item.produtoJoinFaltando ? entradaEmbalagemItemProgressMetrics(item) : null;
        const productionDate = formatDay(item.data_producao);
        const disableMassaAction =
          isMassa && (quantityInfo.hasWarning || Boolean(item.produtoJoinFaltando));

        const receitasNecessarias = quantityInfo.receitas?.value || 0;
        const receitasBatidas = item.receitas_batidas || 0;

        const showMassaMetrics =
          isMassa && !!(quantityInfo.receitas || quantityInfo.assadeiras || quantityInfo.unidades);

        const ordemConcluida = isOrdemStatusConcluida(item.status);

        const isExpanded = expandedOrdemId === item.id;

        if (!isExpanded) {
          return (
            <div
              key={item.id}
              className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 shadow-sm ${
                item.produtoJoinFaltando
                  ? 'border-rose-200/80 bg-rose-50/50'
                  : 'border-gray-100/90 bg-white'
              }`}
            >
              <span
                className="shrink-0 tabular-nums text-[9px] font-semibold leading-none text-slate-500"
                title="Posição na fila de planejamento / total"
              >
                {posicaoNaFila}/{totalNaFila}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleExpandOrdem(item.id)}
                  className="min-w-0 flex-1 truncate text-left text-[10px] font-semibold leading-tight text-gray-800 hover:text-blue-600"
                >
                  {item.produtos.nome}
                </button>
                {ordemConcluida && (
                  <span className="shrink-0 text-[8px] font-semibold leading-none text-emerald-700">Concluído</span>
                )}
              </div>
              {item.produtoJoinFaltando && (
                <span className="material-icons shrink-0 text-[14px] text-rose-500" aria-hidden>
                  error_outline
                </span>
              )}
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className={`group rounded-xl border p-2.5 shadow-sm transition-all duration-200 relative overflow-hidden sm:rounded-2xl sm:p-5 ${
              item.produtoJoinFaltando
                ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                : 'bg-white border-gray-100 hover:shadow-md hover:border-gray-200'
            }`}
          >
            <div className="flex flex-col gap-2 sm:gap-4">
              {/* Linha 1: cabeçalho + ação (massa: layout em colunas; resto: linha flex) */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                {isMassa ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-[11px] leading-snug sm:gap-2.5 sm:text-sm sm:leading-normal">
                    <div className="flex min-w-0 items-start gap-1.5 sm:gap-2">
                      <span
                        className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-800 sm:rounded-lg sm:px-2 sm:py-1 sm:text-xs"
                        title="Ordem de planejamento (fixa); a lista pode mostrar concluídos por último"
                      >
                        {posicaoNaFila}/{totalNaFila}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <button
                          type="button"
                          onClick={() => toggleExpandOrdem(item.id)}
                          className={NAME_BTN_EXPANDED}
                        >
                          {item.produtos.nome}
                        </button>
                        {ordemConcluida && (
                          <span className="shrink-0 text-[10px] font-semibold text-emerald-700 sm:text-xs">Concluído</span>
                        )}
                      </div>
                    </div>

                    {showMassaMetrics ? (
                      <div className="w-full rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-2 sm:rounded-xl sm:px-3 sm:py-2.5">
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                          <div className="min-w-0">
                            <div className={MASSA_METRIC_LABEL}>Receitas</div>
                            <div
                              className={`${MASSA_METRIC_VALUE} ${
                                quantityInfo.receitas?.hasWarning ? 'text-amber-600' : 'text-blue-600'
                              }`}
                            >
                              {quantityInfo.receitas?.readable ?? '—'}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className={MASSA_METRIC_LABEL}>Assadeiras</div>
                            <div
                              className={`${MASSA_METRIC_VALUE} ${
                                quantityInfo.assadeiras ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            >
                              {quantityInfo.assadeiras?.readable ?? '—'}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className={MASSA_METRIC_LABEL}>Unidades</div>
                            <div className={`${MASSA_METRIC_VALUE} text-slate-800`}>
                              {quantityInfo.unidades?.readable ?? '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      quantityInfo.readable && (
                        <p className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm">
                          {quantityInfo.readable}
                        </p>
                      )
                    )}

                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 sm:gap-x-2 sm:gap-y-2">
                      {productionDate && (
                        <span className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:px-2.5 sm:py-1 sm:text-xs">
                          {productionDate}
                        </span>
                      )}
                      {item.pedidos?.clientes?.nome_fantasia && (
                        <span className="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600 sm:gap-1 sm:px-2 sm:text-xs md:text-sm">
                          <span className="material-icons shrink-0 text-[14px] sm:text-sm">person</span>
                          <span className="truncate">{item.pedidos.clientes.nome_fantasia}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-snug sm:gap-x-2 sm:gap-y-1.5 sm:text-sm sm:leading-normal">
                    <span
                      className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-800 sm:rounded-lg sm:px-2 sm:py-1 sm:text-xs"
                      title="Ordem de planejamento (fixa); a lista pode mostrar concluídos por último"
                    >
                      {posicaoNaFila}/{totalNaFila}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExpandOrdem(item.id)}
                      className={`min-w-0 max-w-full ${NAME_BTN_EXPANDED}`}
                    >
                      {item.produtos.nome}
                    </button>
                    {ordemConcluida && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="shrink-0 text-[10px] font-semibold text-emerald-700 sm:text-xs">Concluído</span>
                      </>
                    )}
                    <>
                      <span className="text-gray-300 hidden sm:inline">·</span>
                      <span className="font-semibold text-gray-800 sm:whitespace-nowrap">{headerQuantityReadable}</span>
                    </>
                    {productionDate && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:px-2.5 sm:py-1 sm:text-xs">
                          {productionDate}
                        </span>
                      </>
                    )}
                    {item.pedidos?.clientes?.nome_fantasia && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="inline-flex max-w-[min(100%,14rem)] items-center gap-0.5 truncate rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600 sm:max-w-none sm:gap-1 sm:px-2 sm:text-xs md:text-sm">
                          <span className="material-icons shrink-0 text-[14px] sm:text-sm">person</span>
                          <span className="truncate">{item.pedidos.clientes.nome_fantasia}</span>
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex shrink-0 sm:pl-2 w-full sm:w-auto justify-stretch sm:justify-end sm:pt-0.5">
                  {isMassa && (
                    <button
                      type="button"
                      onClick={() => onOpenMassaLotes(item)}
                      title={
                        item.produtoJoinFaltando
                          ? 'Corrija o cadastro do produto antes de iniciar a massa'
                          : undefined
                      }
                      className={`${BTN_PRIMARY} w-full sm:w-auto ${
                        disableMassaAction
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99]'
                      }`}
                      disabled={disableMassaAction}
                    >
                      <span className={BTN_PRIMARY_ICON}>play_circle</span>
                      <span>Iniciar</span>
                    </button>
                  )}
                  {isFermentacao && (
                    <button
                      type="button"
                      onClick={() => {
                        if (item.produtoJoinFaltando) return;
                        if (onOpenFermentacaoModal) {
                          onOpenFermentacaoModal(item);
                        } else {
                          router.push(etapaPathForOrdem(item.id, 'fermentacao'));
                        }
                      }}
                      disabled={Boolean(item.produtoJoinFaltando)}
                      title={
                        item.produtoJoinFaltando
                          ? 'Corrija o cadastro do produto antes de iniciar a fermentação'
                          : undefined
                      }
                      className={`${BTN_PRIMARY} w-full sm:w-auto ${
                        item.produtoJoinFaltando
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99]'
                      }`}
                    >
                      <span className={BTN_PRIMARY_ICON}>play_circle</span>
                      <span>Iniciar</span>
                    </button>
                  )}
                  {isEntradaEmbalagem && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.produtoJoinFaltando) {
                          router.push(etapaPathForOrdem(item.id, 'entrada_embalagem'));
                        }
                      }}
                      disabled={Boolean(item.produtoJoinFaltando)}
                      className={`${BTN_PRIMARY} w-full sm:w-auto ${
                        item.produtoJoinFaltando
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99]'
                      }`}
                    >
                      <span className={BTN_PRIMARY_ICON}>inventory_2</span>
                      <span>Abrir</span>
                    </button>
                  )}
                  {isSaidaEmbalagem && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.produtoJoinFaltando) {
                          router.push(etapaPathForOrdem(item.id, 'saida_embalagem'));
                        }
                      }}
                      disabled={Boolean(item.produtoJoinFaltando)}
                      className={`${BTN_PRIMARY} w-full sm:w-auto ${
                        item.produtoJoinFaltando
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99]'
                      }`}
                    >
                      <span className={BTN_PRIMARY_ICON}>local_shipping</span>
                      <span>Abrir</span>
                    </button>
                  )}
                  {!isPlanning &&
                    !isMassa &&
                    !isFermentacao &&
                    !isEntradaForno &&
                    !isSaidaForno &&
                    !isEntradaEmbalagem &&
                    !isSaidaEmbalagem && (
                      <button
                        type="button"
                        className={`${BTN_PRIMARY} w-full sm:w-auto bg-white border border-gray-100 text-gray-600 hover:bg-gray-50`}
                      >
                        <span className="material-icons text-[18px] text-gray-400 sm:text-[26px]">visibility</span>
                        Detalhes
                      </button>
                    )}
                </div>
              </div>

              {item.produtoJoinFaltando && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-100 px-2 py-1.5 text-rose-900 sm:px-3 sm:py-2">
                  <span className="material-icons shrink-0 text-sm sm:text-base">link_off</span>
                  <span className="text-xs leading-snug sm:text-sm">
                    <span className="font-medium">Produto não encontrado no cadastro.</span> ID informado na ordem:{' '}
                    <code className="rounded bg-white/80 px-1 py-0.5 text-xs">{item.produto_id}</code>. Edite a ordem e
                    associe um produto válido ou restaure o cadastro no Supabase.
                  </span>
                </div>
              )}

              {quantityInfo.hasWarning && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-800 sm:px-3 sm:py-2">
                  <span className="material-icons text-sm sm:text-base">warning</span>
                  <span className="text-xs leading-snug sm:text-sm">
                    {quantityInfo.warningMessage || 'Receita obrigatória não configurada para este produto.'}
                  </span>
                </div>
              )}

              {/* Linha 2: barras de progresso */}
              {isMassa && receitasNecessarias > 0 && (
                <div className="w-full pt-0.5">
                  <ProductionProgressBar receitasOP={receitasNecessarias} receitasMassa={receitasBatidas} />
                </div>
              )}
              {isFermentacao && (
                <div className="w-full pt-0.5">
                  <FermentacaoProgressoBar variant="compact" {...fermentacaoProgressMetricsForQueueItem(item)} />
                </div>
              )}
              {embalagemEntradaProgress && (
                <div className="w-full pt-0.5 border-t border-slate-100">
                  <div className="pt-3">
                    <VolumeTriploProgressoBar
                      variant="compact"
                      embedded
                      meta={embalagemEntradaProgress.meta}
                      etapaAnterior={embalagemEntradaProgress.saidaForno}
                      etapaAtual={embalagemEntradaProgress.entradaEmbalagem}
                      unidadeCurta={embalagemEntradaProgress.unidadeCurta}
                      unidadesPorAssadeira={embalagemEntradaProgress.unidadesPorAssadeira}
                      statsColumnOrder={['atual', 'anterior', 'meta']}
                      labels={{
                        unitLine: '',
                        meta: 'Ordem de produção de hoje',
                        etapaAnterior: 'Volume na etapa anterior (Saída do forno)',
                        etapaAtual: 'Entrada na embalagem',
                        compactAnterior: 'Saída forno',
                        compactAtual: 'Entrada emb.',
                        footer: null,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
  };

  return (
    <>
      {queueForCardsActive.map((item, i) => renderOrdemCard(item, i))}
      {queueForCardsProntos.length > 0 && (
        <>
          <div className="w-full border-t border-slate-200/90 pt-3 mt-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">
              {tituloSecaoProntos}
            </p>
          </div>
          {queueForCardsProntos.map((item, i) => renderOrdemCard(item, i))}
        </>
      )}
    </>
  );
}
