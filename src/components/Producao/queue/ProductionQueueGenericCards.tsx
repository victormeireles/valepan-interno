'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductionProgressBar from '@/components/Producao/ProductionProgressBar';
import FermentacaoProgressoBar from '@/components/Producao/FermentacaoProgressoBar';
import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import {
  entradaEmbalagemItemProgressMetrics,
  filaCardEstadoVisual,
  fermentacaoProgressMetricsForQueueItem,
  planningOrderRankById,
  type FilaCardEstadoVisual,
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
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold shadow-sm border transition-all whitespace-nowrap px-3 py-2.5 text-xs leading-tight min-h-[48px] sm:gap-2 sm:rounded-xl sm:px-5 sm:py-3 sm:text-base sm:leading-normal sm:min-h-[52px]';
const BTN_PRIMARY_ICON = 'material-icons text-[18px] leading-none sm:text-[26px]';

const MASSA_METRIC_LABEL = 'text-xs font-semibold uppercase tracking-wide text-slate-500';
const MASSA_METRIC_VALUE =
  'mt-0.5 text-xs font-semibold tabular-nums leading-tight break-words sm:text-sm';

const NAME_BTN_EXPANDED =
  'min-w-0 flex-1 flex text-left text-sm font-bold leading-snug text-gray-900 transition-colors hover:text-blue-600 min-h-[44px] items-center py-1 sm:min-h-0 sm:py-0 sm:text-base sm:leading-snug md:text-lg cursor-pointer';

function isOrdemStatusConcluida(status: string | null | undefined): boolean {
  return typeof status === 'string' && status.toLowerCase() === 'concluido';
}

function filaCardShellClass(estado: FilaCardEstadoVisual, joinFaltando: boolean): string {
  if (joinFaltando) return 'border-rose-200/80 bg-rose-50/50';
  switch (estado) {
    case 'finalizada':
      return 'border-emerald-200/85 bg-emerald-50/40';
    case 'em_andamento':
      return 'border-amber-200/85 bg-amber-50/45';
    case 'proximo':
      return 'border-sky-400/75 bg-sky-50/50 ring-1 ring-sky-200/55';
    default:
      return 'border-gray-100/90 bg-white';
  }
}

function filaCardSelo(estado: FilaCardEstadoVisual): { label: string; className: string } | null {
  switch (estado) {
    case 'finalizada':
      return {
        label: 'Etapa ok',
        className:
          'shrink-0 rounded-full border border-emerald-300/90 bg-emerald-100/95 px-1.5 py-0.5 text-xs font-semibold leading-none text-emerald-950',
      };
    case 'em_andamento':
      return {
        label: 'Em andamento',
        className:
          'shrink-0 rounded-full border border-amber-300/90 bg-amber-100/95 px-1.5 py-0.5 text-xs font-semibold leading-none text-amber-950',
      };
    case 'proximo':
      return {
        label: 'Próximo',
        className:
          'shrink-0 rounded-full border border-sky-400/90 bg-sky-100/95 px-1.5 py-0.5 text-xs font-semibold leading-none text-sky-950',
      };
    case 'pendente':
      return {
        label: 'Não iniciado',
        className:
          'shrink-0 rounded-full border border-slate-300/90 bg-slate-100/95 px-1.5 py-0.5 text-xs font-semibold leading-none text-slate-700',
      };
    default:
      return null;
  }
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

  const renderOrdemCard = (
    item: ProductionQueueItem,
    index: number,
    fromProntosSection: boolean,
    isFirstActiveInFila: boolean,
  ) => {
        const posicaoNaFila = posicaoPorPlanejamento.get(item.id) ?? index + 1;
        const totalNaFila = totalOrdensNaFila;

        const filaEstado = filaCardEstadoVisual(item, effectiveStation, {
          fromProntosSection,
          isFirstActiveInFila,
        });
        const shell = filaCardShellClass(filaEstado, Boolean(item.produtoJoinFaltando));
        const estadoSelo = filaCardSelo(filaEstado);

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
            <button
              key={item.id}
              type="button"
              onClick={() => toggleExpandOrdem(item.id)}
              className={`flex w-full min-h-[52px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left shadow-sm active:opacity-95 ${shell}`}
            >
              <span
                className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-100/95 px-2 py-1 tabular-nums text-xs font-bold leading-none text-slate-700"
                title="Posição na fila de planejamento / total"
              >
                {posicaoNaFila}/{totalNaFila}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold leading-snug text-gray-800">
                    {item.produtos.nome}
                  </span>
                  {isMassa && item.lata_tipo_nome && !item.produtoJoinFaltando && (
                    <span
                      className="mt-0.5 block truncate text-xs font-medium leading-tight text-slate-500"
                      title={`Lata: ${item.lata_tipo_nome}`}
                    >
                      Lata: {item.lata_tipo_nome}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  {estadoSelo && <span className={estadoSelo.className}>{estadoSelo.label}</span>}
                  {ordemConcluida && (
                    <span className="shrink-0 text-xs font-semibold leading-none text-emerald-800">
                      Concluído
                    </span>
                  )}
                </div>
              </div>
              {item.produtoJoinFaltando && (
                <span className="material-icons shrink-0 text-lg text-rose-500" aria-hidden>
                  error_outline
                </span>
              )}
            </button>
          );
        }

        return (
          <div
            key={item.id}
            className={`group relative overflow-hidden rounded-xl border p-3 shadow-sm transition-all duration-200 hover:shadow-md sm:rounded-2xl sm:p-5 ${shell} ${
              item.produtoJoinFaltando ? 'hover:border-rose-300' : 'hover:border-slate-300/80'
            }`}
          >
            <div className="flex flex-col gap-2 sm:gap-4">
              {/* Linha 1: cabeçalho + ação (massa: layout em colunas; resto: linha flex) */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                {isMassa ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs leading-snug sm:gap-2.5 sm:text-sm sm:leading-normal">
                    <div className="flex min-w-0 items-start gap-1.5 sm:gap-2">
                      <span
                        className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-bold tabular-nums text-slate-800 sm:rounded-lg sm:px-2 sm:py-1"
                        title="Ordem de planejamento (fixa); a lista pode mostrar concluídos por último"
                      >
                        {posicaoNaFila}/{totalNaFila}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:items-baseline sm:gap-y-0.5">
                        <button
                          type="button"
                          onClick={() => toggleExpandOrdem(item.id)}
                          className={NAME_BTN_EXPANDED}
                        >
                          {item.produtos.nome}
                        </button>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          {estadoSelo && <span className={estadoSelo.className}>{estadoSelo.label}</span>}
                          {ordemConcluida && (
                            <span className="shrink-0 text-xs font-semibold text-emerald-800">
                              Concluído
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.lata_tipo_nome && !item.produtoJoinFaltando && (
                      <p className="rounded-lg border border-slate-100 bg-slate-50/90 px-2.5 py-1.5 text-center text-xs text-slate-700">
                        <span className="text-slate-500">Lata</span>{' '}
                        <span className="font-semibold text-slate-900">{item.lata_tipo_nome}</span>
                      </p>
                    )}

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
                        <span className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 sm:px-2.5 sm:py-1">
                          {productionDate}
                        </span>
                      )}
                      {item.pedidos?.clientes?.nome_fantasia && (
                        <span className="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-md bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600 sm:gap-1 sm:px-2 md:text-sm">
                          <span className="material-icons shrink-0 text-[14px] sm:text-sm">person</span>
                          <span className="truncate">{item.pedidos.clientes.nome_fantasia}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs leading-snug sm:gap-x-2.5 sm:text-sm sm:leading-normal">
                    <span
                      className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-bold tabular-nums text-slate-800 sm:rounded-lg sm:px-2 sm:py-1"
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
                    {estadoSelo && <span className={estadoSelo.className}>{estadoSelo.label}</span>}
                    {ordemConcluida && (
                      <span className="shrink-0 text-xs font-semibold text-emerald-800">Concluído</span>
                    )}
                    <span className="font-semibold text-gray-800 sm:whitespace-nowrap">{headerQuantityReadable}</span>
                    {productionDate && (
                      <span className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 sm:px-2.5 sm:py-1">
                        {productionDate}
                      </span>
                    )}
                    {item.pedidos?.clientes?.nome_fantasia && (
                      <span className="inline-flex max-w-[min(100%,14rem)] items-center gap-0.5 truncate rounded-md bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600 sm:max-w-none sm:gap-1 sm:px-2 md:text-sm">
                        <span className="material-icons shrink-0 text-[14px] sm:text-sm">person</span>
                        <span className="truncate">{item.pedidos.clientes.nome_fantasia}</span>
                      </span>
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
                          : receitasBatidas > 0
                            ? 'Continuar registro de massa desta ordem'
                            : 'Iniciar massa desta ordem'
                      }
                      className={`${BTN_PRIMARY} w-full sm:w-auto ${
                        disableMassaAction
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99]'
                      }`}
                      disabled={disableMassaAction}
                    >
                      <span className={BTN_PRIMARY_ICON}>play_circle</span>
                      <span>{receitasBatidas > 0 ? 'Continuar massa' : 'Iniciar massa'}</span>
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
                      <span>Iniciar fermentação</span>
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
                      <span>Registrar entrada</span>
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
                      <span>Registrar saída</span>
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
      {queueForCardsActive.map((item, i) => renderOrdemCard(item, i, false, i === 0))}
      {queueForCardsProntos.length > 0 && (
        <>
          <div className="w-full border-t border-slate-200/90 pt-3 mt-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {tituloSecaoProntos}
            </p>
          </div>
          {queueForCardsProntos.map((item, i) => renderOrdemCard(item, i, true, false))}
        </>
      )}
    </>
  );
}
