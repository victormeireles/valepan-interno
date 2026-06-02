'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductionProgressBar from '@/components/Producao/ProductionProgressBar';
import FermentacaoProgressoBar from '@/components/Producao/FermentacaoProgressoBar';
import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';
import FilaOrdemProducaoProgressBar from '@/components/Producao/queue/FilaOrdemProducaoProgressBar';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import {
  BTN_ADIANTAR_ICON_SM,
  BTN_ADIANTAR_PRIMARY_INLINE,
  BTN_ADIANTAR_SECONDARY,
  filaEtapaTemBotaoAdiantar,
} from '@/components/Producao/queue/fila-adiantar-etapas-ui';
import {
  entradaEmbalagemItemProgressMetrics,
  filaCardEstadoVisual,
  filaMensagemPreRequisitoEtapaAnterior,
  fermentacaoProgressMetricsForQueueItem,
  labelConfirmarEtapasNaFila,
  ordemAdiantarEtapasComoSecundarioNaFila,
  ordemFaltaPreRequisitosNaEtapaFila,
  ordemMostrarConfirmarEtapasNaFila,
  ordemPreRequisitosAtendidosParaTrabalharNaEtapa,
  ordemProntaNaEtapaFila,
  planningOrderRankById,
  saidaEmbalagemItemProgressMetrics,
  filaEtapaProgressoRelativoPct,
  type FilaCardEstadoVisual,
} from '@/components/Producao/queue/production-queue-metrics';
import {
  massaReceitasMetaAtingida,
  pedirConfirmacaoSeMassaMetaAtingida,
} from '@/lib/production/massa-novo-lote-confirm';
import { getQuantityByStation, type Station } from '@/lib/utils/production-conversions';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';
import type { ProductionQueueStationFlags } from '@/hooks/useProductionQueueDerived';
import FilaEntradaEmbalagemRegistrosEditor from '@/components/Producao/queue/FilaEntradaEmbalagemRegistrosEditor';
import FilaSaidaEmbalagemRegistrosEditor from '@/components/Producao/queue/FilaSaidaEmbalagemRegistrosEditor';
import FilaFermentacaoCarrinhosEditor from '@/components/Producao/queue/FilaFermentacaoCarrinhosEditor';

interface Props {
  queueForCardsActive: ProductionQueueItem[];
  queueForCardsProntos: ProductionQueueItem[];
  /** Primeira ordem que já pode registar trabalho nesta etapa — destaca como «Próximo». */
  primeiraOrdemAcionavelId: string | null;
  /** Título da secção inferior (meta/etapa já concluída nesta fila). */
  tituloSecaoProntos: string;
  /** Mesmo conjunto filtrado da estação, na ordem de planejamento do servidor — usado só para o badge X/Y (fixo). */
  queueForPlanningOrder: ProductionQueueItem[];
  effectiveStation: Station;
  flags: ProductionQueueStationFlags;
  router: { push: (href: string) => void; refresh: () => void };
  /** `list` = ver/editar lotes; `newLote` = abrir formulário de novo lote. */
  onOpenMassaLotes: (item: ProductionQueueItem, mode?: 'list' | 'newLote') => void;
  /** Na fermentação: abre modal (carrinho + assadeiras) em vez de ir à página da ordem. */
  onOpenFermentacaoModal?: (item: ProductionQueueItem) => void;
  onOpenPreRequisitoSync: (item: ProductionQueueItem) => void;
}

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold shadow-sm border transition-all whitespace-nowrap px-3 py-2.5 text-xs leading-tight min-h-[48px] sm:gap-2 sm:rounded-xl sm:px-5 sm:py-3 sm:text-base sm:leading-normal sm:min-h-[52px]';
/** Botões no card expandido (menos altos, leitura em fila). */
const BTN_CARD =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition-colors min-h-[42px] sm:min-h-[44px]';
const BTN_PRIMARY_ICON = 'material-icons text-[18px] leading-none sm:text-[26px]';
const BTN_CARD_ICON = 'material-icons text-[20px] leading-none';

const MASSA_METRIC_LABEL = 'text-xs font-semibold uppercase tracking-wide text-slate-500';
const MASSA_METRIC_VALUE =
  'mt-0.5 text-xs font-semibold tabular-nums leading-tight break-words sm:text-sm';

const NAME_BTN_EXPANDED =
  'min-w-0 flex-1 flex text-left text-sm font-bold leading-snug text-gray-900 transition-colors hover:text-blue-600 min-h-[44px] items-center py-1 sm:min-h-0 sm:py-0 sm:text-base sm:leading-snug md:text-lg cursor-pointer';

function isOrdemStatusConcluida(status: string | null | undefined): boolean {
  return typeof status === 'string' && status.toLowerCase() === 'concluido';
}

function stripCapacidadePorLata(text: string): string {
  // Ex.: "500 LT c/ 48" -> "500 LT"
  return text.replace(/\s*c\/\s*\d+/gi, '').replace(/\s{2,}/g, ' ').trim();
}

function filaCardShellClass(estado: FilaCardEstadoVisual, joinFaltando: boolean): string {
  if (joinFaltando) return 'border-rose-200/80 bg-rose-50/50';
  switch (estado) {
    case 'finalizada':
      return 'border-emerald-200/85 bg-emerald-50/40';
    case 'em_andamento':
      return 'border-slate-250 bg-slate-50/60';
    case 'proximo':
      return 'border-slate-300/90 bg-white ring-1 ring-slate-200/70';
    case 'aguardando_etapa_anterior':
      return 'border-violet-200/80 bg-violet-50/35';
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
    case 'aguardando_etapa_anterior':
      return {
        label: 'Aguardando etapa anterior',
        className:
          'shrink-0 rounded-full border border-violet-300/90 bg-violet-100/95 px-1.5 py-0.5 text-xs font-semibold leading-none text-violet-950',
      };
    default:
      return null;
  }
}

export default function ProductionQueueGenericCards({
  queueForCardsActive,
  queueForCardsProntos,
  primeiraOrdemAcionavelId,
  tituloSecaoProntos,
  queueForPlanningOrder,
  effectiveStation,
  flags,
  router,
  onOpenMassaLotes,
  onOpenFermentacaoModal,
  onOpenPreRequisitoSync,
}: Props) {
  const [expandedOrdemId, setExpandedOrdemId] = useState<string | null>(null);

  const podeSincronizarPreRequisito: boolean =
    effectiveStation === 'fermentacao' ||
    effectiveStation === 'entrada_forno' ||
    effectiveStation === 'saida_forno' ||
    effectiveStation === 'entrada_embalagem' ||
    effectiveStation === 'saida_embalagem';

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
    isMassa,
    isFermentacao,
    isEntradaForno,
    isSaidaForno,
    isEntradaEmbalagem,
    isSaidaEmbalagem,
  } = flags;

  const renderOrdemCard = (
    item: ProductionQueueItem,
    index: number,
    fromProntosSection: boolean,
    isFirstActionableInFila: boolean,
  ) => {
        const posicaoNaFila = posicaoPorPlanejamento.get(item.id) ?? index + 1;
        const totalNaFila = totalOrdensNaFila;

        const podeAtuarNestaEtapa = ordemPreRequisitosAtendidosParaTrabalharNaEtapa(item, effectiveStation);
        // Etapa já 100% (meta atingida / adiantada): não permitir NOVO registro de latas;
        // edição/exclusão continuam disponíveis pelos editores inline do card.
        const etapaConcluida =
          !item.produtoJoinFaltando && ordemProntaNaEtapaFila(item, effectiveStation);
        const faltaPreRequisitos = ordemFaltaPreRequisitosNaEtapaFila(item, effectiveStation);
        const mostrarConfirmarEtapas = ordemMostrarConfirmarEtapasNaFila(item, effectiveStation);
        const labelConfirmarEtapas = labelConfirmarEtapasNaFila(item, effectiveStation);
        const mostrarAdiantarBtn =
          podeSincronizarPreRequisito && ordemMostrarConfirmarEtapasNaFila(item, effectiveStation);
        const adiantarComoSecundario = ordemAdiantarEtapasComoSecundarioNaFila(item, effectiveStation);
        const adiantarOcultoNoColapsado = filaEtapaTemBotaoAdiantar(effectiveStation);
        const msgAguardando = filaMensagemPreRequisitoEtapaAnterior(effectiveStation);

        const filaEstado = filaCardEstadoVisual(item, effectiveStation, {
          fromProntosSection,
          isFirstActionableInFila,
        });
        const shell = filaCardShellClass(
          filaEstado,
          Boolean(item.produtoJoinFaltando && !item.produtoCargaFilaErro),
        );
        const estadoSelo = filaCardSelo(filaEstado);

        const quantidadeParaCalculo = item.qtd_planejada;
        const unConsumo =
          item.planejado_unidades_consumo != null &&
          Number.isFinite(item.planejado_unidades_consumo) &&
          item.planejado_unidades_consumo >= 0
            ? item.planejado_unidades_consumo
            : undefined;
        const quantityInfo = getQuantityByStation(
          effectiveStation,
          quantidadeParaCalculo,
          item.produtos,
          unConsumo,
        );
        const headerQuantityReadable = isEntradaEmbalagem
          ? getQuantityByStation('saida_forno', quantidadeParaCalculo, item.produtos, unConsumo).readable
          : quantityInfo.readable;
        const headerQuantityReadableSemCapacidade = stripCapacidadePorLata(headerQuantityReadable);
        const embalagemEntradaProgress =
          isEntradaEmbalagem && !item.produtoJoinFaltando ? entradaEmbalagemItemProgressMetrics(item) : null;
        const embalagemSaidaProgress =
          isSaidaEmbalagem && !item.produtoJoinFaltando ? saidaEmbalagemItemProgressMetrics(item) : null;
        const embalagemSaidaResumoCompacto = embalagemSaidaProgress
          ? (() => {
              const se = embalagemSaidaProgress;
              const parts: string[] = [];
              parts.push(
                se.lotesEntrada === 1
                  ? '1 lote na embalagem'
                  : `${se.lotesEntrada} lotes na embalagem`,
              );
              if (se.metaCaixas != null && se.caixasInformadas != null) {
                parts.push(`${se.caixasInformadas}/${Number.isInteger(se.metaCaixas) ? se.metaCaixas : se.metaCaixas.toFixed(1)} cx`);
              } else if (se.caixasInformadas != null) {
                parts.push(`${se.caixasInformadas} cx`);
              }
              return parts.join(' · ');
            })()
          : null;
        const disableMassaAction =
          isMassa && (quantityInfo.hasWarning || Boolean(item.produtoJoinFaltando));

        const receitasNecessarias = quantityInfo.receitas?.value || 0;
        const receitasBatidas = item.receitas_batidas || 0;
        const massaMetaJaAtingida =
          isMassa &&
          !item.produtoJoinFaltando &&
          massaReceitasMetaAtingida(receitasBatidas, receitasNecessarias);

        const showMassaMetrics =
          isMassa && !!(quantityInfo.receitas || quantityInfo.assadeiras || quantityInfo.unidades);

        const ordemConcluida = isOrdemStatusConcluida(item.status);
        const massaResumoCompacto =
          isMassa && !item.produtoJoinFaltando
            ? [
                headerQuantityReadableSemCapacidade || null,
                item.lata_tipo_nome ? `(${item.lata_tipo_nome})` : null,
              ]
                .filter((x): x is string => Boolean(x))
                .join(' ')
            : '';
        const fermentacaoResumoCompacto =
          isFermentacao && !item.produtoJoinFaltando
            ? [
                headerQuantityReadableSemCapacidade || null,
                item.lata_tipo_nome ? `(${item.lata_tipo_nome})` : null,
              ]
                .filter((x): x is string => Boolean(x))
                .join(' ')
            : '';

        // Observação em destaque conforme o estágio: produção (massa/fermentação) ou embalagem.
        const obsProducaoDestaque =
          (effectiveStation === 'massa' || effectiveStation === 'fermentacao') &&
          item.observacao_producao &&
          item.observacao_producao.trim() !== ''
            ? item.observacao_producao.trim()
            : '';
        const obsEmbalagemDestaque =
          (effectiveStation === 'entrada_embalagem' || effectiveStation === 'saida_embalagem') &&
          item.observacao_embalagem &&
          item.observacao_embalagem.trim() !== ''
            ? item.observacao_embalagem.trim()
            : '';
        const obsDestaqueTexto = obsProducaoDestaque || obsEmbalagemDestaque;
        const obsDestaqueLabel = obsProducaoDestaque
          ? 'Observação da produção'
          : 'Observação de embalagem';

        const isExpanded = expandedOrdemId === item.id;

        if (!isExpanded) {
          const mostrarConfirmarColapsado =
            mostrarConfirmarEtapas && podeSincronizarPreRequisito && !item.produtoJoinFaltando;
          return (
            <div
              key={item.id}
              className={`flex w-full min-h-[52px] items-center gap-2 rounded-xl border px-2 py-2 shadow-sm sm:gap-2.5 sm:px-3 sm:py-2.5 ${shell}`}
            >
              <button
                type="button"
                onClick={() => toggleExpandOrdem(item.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left active:opacity-95"
              >
              <span
                className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-100/95 px-2 py-1 tabular-nums text-xs font-bold leading-none text-slate-700"
                title="Posição na fila de planejamento / total"
              >
                {posicaoNaFila}/{totalNaFila}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex w-full min-w-0 items-center gap-2">
                  <span className="min-w-0 max-w-[42%] shrink truncate text-sm font-semibold leading-snug text-gray-800 sm:max-w-[46%]">
                    {item.produtos.nome}
                  </span>
                  {!item.produtoJoinFaltando && (
                    <FilaOrdemProducaoProgressBar
                      pct={filaEtapaProgressoRelativoPct(item, effectiveStation)}
                      className="basis-0"
                    />
                  )}
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    {estadoSelo && <span className={estadoSelo.className}>{estadoSelo.label}</span>}
                    {ordemConcluida && (
                      <span className="shrink-0 text-xs font-semibold leading-none text-emerald-800">
                        Concluído
                      </span>
                    )}
                  </div>
                </div>
                {isSaidaEmbalagem && embalagemSaidaResumoCompacto && (
                  <span
                    className="block truncate text-left text-xs font-medium leading-tight text-slate-500"
                    title={embalagemSaidaResumoCompacto}
                  >
                    {embalagemSaidaResumoCompacto}
                  </span>
                )}
                {isMassa && massaResumoCompacto && (
                  <span
                    className="block truncate text-left text-xs font-medium leading-tight text-slate-500"
                    title={massaResumoCompacto}
                  >
                    {massaResumoCompacto}
                  </span>
                )}
                {isFermentacao && fermentacaoResumoCompacto && (
                  <span
                    className="block truncate text-left text-xs font-medium leading-tight text-slate-500"
                    title={fermentacaoResumoCompacto}
                  >
                    {fermentacaoResumoCompacto}
                  </span>
                )}
                {isEntradaEmbalagem &&
                  (item.receitas_batidas ?? 0) > 0 &&
                  !item.produtoJoinFaltando &&
                  !adiantarOcultoNoColapsado && (
                  <span className="block text-left text-[11px] font-medium text-emerald-800">
                    {Math.round(item.receitas_batidas ?? 0)} receita
                    {Math.round(item.receitas_batidas ?? 0) === 1 ? '' : 's'} na massa
                    {mostrarConfirmarColapsado ? ' · expanda para confirmar etapas' : ''}
                  </span>
                )}
                {mostrarConfirmarColapsado &&
                  !adiantarOcultoNoColapsado &&
                  effectiveStation !== 'entrada_embalagem' && (
                  <span className="block text-left text-[11px] font-medium text-violet-800">
                    Etapas anteriores em falta · expanda para confirmar etapas
                  </span>
                )}
                {obsDestaqueTexto && !item.produtoJoinFaltando && (
                  <span
                    className="mt-0.5 block rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-left text-[11px] font-semibold leading-tight text-amber-900"
                    title={`${obsDestaqueLabel}: ${obsDestaqueTexto}`}
                  >
                    <span className="font-bold uppercase tracking-wide text-amber-700">
                      {obsProducaoDestaque ? 'Obs. produção' : 'Obs. embalagem'}
                    </span>{' '}
                    {obsDestaqueTexto}
                  </span>
                )}
              </div>
              {item.produtoJoinFaltando && (
                <span className="material-icons shrink-0 text-lg text-rose-500" aria-hidden>
                  error_outline
                </span>
              )}
              </button>
            </div>
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
              <div
                className={`flex flex-col gap-2 sm:gap-4 ${
                  isEntradaEmbalagem || isSaidaEmbalagem
                    ? ''
                    : 'sm:flex-row sm:items-start sm:justify-between'
                }`}
              >
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

                    {obsDestaqueTexto && !item.produtoJoinFaltando && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          {obsDestaqueLabel}
                          {item.lata_tipo_nome ? ` · ${item.lata_tipo_nome}` : ''}
                        </div>
                        <p className="mt-0.5 whitespace-pre-line text-xs font-semibold text-amber-900">
                          {obsDestaqueTexto}
                        </p>
                      </div>
                    )}

                    {showMassaMetrics ? (
                      <div className="w-full rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-2 sm:rounded-xl sm:px-3 sm:py-2.5">
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                          <div className="min-w-0">
                            <div className={MASSA_METRIC_LABEL}>Receitas</div>
                            <div className={`${MASSA_METRIC_VALUE} text-slate-800`}>
                              {quantityInfo.receitas?.readable ?? '—'}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className={MASSA_METRIC_LABEL}>Assadeiras</div>
                            <div className={`${MASSA_METRIC_VALUE} text-slate-800`}>
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
                      {item.pedidos?.clientes?.nome_fantasia && (
                        <span className="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-md bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600 sm:gap-1 sm:px-2 md:text-sm">
                          <span className="material-icons shrink-0 text-[14px] sm:text-sm">person</span>
                          <span className="truncate">{item.pedidos.clientes.nome_fantasia}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : isEntradaEmbalagem ? (
                  <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <span
                        className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-bold tabular-nums text-slate-800"
                        title="Posição na fila"
                      >
                        {posicaoNaFila}/{totalNaFila}
                      </span>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleExpandOrdem(item.id)}
                          className="text-left text-sm font-bold leading-snug text-gray-900 hover:text-blue-600 sm:text-base"
                        >
                          {item.produtos.nome}
                        </button>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {estadoSelo ? (
                            <span className={estadoSelo.className}>{estadoSelo.label}</span>
                          ) : null}
                          {embalagemEntradaProgress ? (
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-800">
                              {Math.round(embalagemEntradaProgress.entradaEmbalagem)} /{' '}
                              {Math.round(embalagemEntradaProgress.meta)} LT
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-700">
                              {headerQuantityReadableSemCapacidade}
                            </span>
                          )}
                        </div>
                        {item.pedidos?.clientes?.nome_fantasia ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                            <span className="material-icons text-[14px]">person</span>
                            <span className="truncate">{item.pedidos.clientes.nome_fantasia}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {(mostrarAdiantarBtn || adiantarComoSecundario) && (
                      <div className="flex flex-col gap-2">
                        {mostrarAdiantarBtn && !adiantarComoSecundario ? (
                          <button
                            type="button"
                            onClick={() => onOpenPreRequisitoSync(item)}
                            className={`${BTN_ADIANTAR_PRIMARY_INLINE} self-start`}
                          >
                            <span className={BTN_ADIANTAR_ICON_SM}>playlist_add_check</span>
                            <span>{labelConfirmarEtapas}</span>
                          </button>
                        ) : null}
                        {adiantarComoSecundario ? (
                          <button
                            type="button"
                            onClick={() => onOpenPreRequisitoSync(item)}
                            className={`${BTN_ADIANTAR_SECONDARY} self-start`}
                          >
                            <span className={BTN_ADIANTAR_ICON_SM}>playlist_add_check</span>
                            <span>{labelConfirmarEtapas}</span>
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : isSaidaEmbalagem ? (
                  <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <span
                        className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-bold tabular-nums text-slate-800"
                        title="Posição na fila"
                      >
                        {posicaoNaFila}/{totalNaFila}
                      </span>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleExpandOrdem(item.id)}
                          className="text-left text-sm font-bold leading-snug text-gray-900 hover:text-blue-600 sm:text-base"
                        >
                          {item.produtos.nome}
                        </button>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {estadoSelo ? (
                            <span className={estadoSelo.className}>{estadoSelo.label}</span>
                          ) : null}
                          {embalagemSaidaProgress?.metaCaixas != null ? (
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-800">
                              {embalagemSaidaProgress.caixasInformadas ?? 0} /{' '}
                              {Number.isInteger(embalagemSaidaProgress.metaCaixas)
                                ? embalagemSaidaProgress.metaCaixas
                                : embalagemSaidaProgress.metaCaixas.toFixed(1)}{' '}
                              cx
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-700">
                              {headerQuantityReadableSemCapacidade}
                            </span>
                          )}
                        </div>
                        {item.pedidos?.clientes?.nome_fantasia ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                            <span className="material-icons text-[14px]">person</span>
                            <span className="truncate">{item.pedidos.clientes.nome_fantasia}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {faltaPreRequisitos && msgAguardando ? (
                      <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-950">
                        {msgAguardando}
                      </p>
                    ) : null}

                    {adiantarComoSecundario &&
                    embalagemSaidaProgress?.metaCaixas != null &&
                    embalagemSaidaProgress.caixasInformadas != null ? (
                      <p className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs leading-relaxed text-violet-900">
                        Faltam{' '}
                        <span className="font-semibold tabular-nums">
                          {Math.max(
                            0,
                            Math.round(
                              embalagemSaidaProgress.metaCaixas - embalagemSaidaProgress.caixasInformadas,
                            ),
                          )}{' '}
                          caixas
                        </span>
                        . Use o atalho abaixo para adiantar etapas anteriores, se necessário.
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-2">
                      {mostrarAdiantarBtn && !adiantarComoSecundario ? (
                        <button
                          type="button"
                          onClick={() => onOpenPreRequisitoSync(item)}
                          className={`${BTN_ADIANTAR_PRIMARY_INLINE} self-start`}
                        >
                          <span className={BTN_ADIANTAR_ICON_SM}>playlist_add_check</span>
                          <span>{labelConfirmarEtapas}</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.produtoJoinFaltando && podeAtuarNestaEtapa) {
                            router.push(etapaPathForOrdem(item.id, 'saida_embalagem'));
                          }
                        }}
                        disabled={Boolean(item.produtoJoinFaltando) || !podeAtuarNestaEtapa}
                        title={
                          !podeAtuarNestaEtapa && !item.produtoJoinFaltando
                            ? (msgAguardando ?? undefined)
                            : undefined
                        }
                        className={`${BTN_CARD} ${
                          item.produtoJoinFaltando || !podeAtuarNestaEtapa
                            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                            : 'border-slate-300 bg-slate-800 text-white hover:bg-slate-700'
                        }`}
                      >
                        <span className={BTN_CARD_ICON}>assignment_turned_in</span>
                        <span>Registrar saída de embalagem</span>
                      </button>
                      {adiantarComoSecundario ? (
                        <button
                          type="button"
                          onClick={() => onOpenPreRequisitoSync(item)}
                          className={`${BTN_ADIANTAR_SECONDARY} self-start`}
                        >
                          <span className={BTN_ADIANTAR_ICON_SM}>playlist_add_check</span>
                          <span>{labelConfirmarEtapas}</span>
                        </button>
                      ) : null}
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
                    {isSaidaEmbalagem && embalagemSaidaResumoCompacto && (
                      <span className="w-full basis-full text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">
                        {embalagemSaidaResumoCompacto}
                      </span>
                    )}
                    <span className="font-semibold text-gray-800 sm:whitespace-nowrap">
                      {headerQuantityReadableSemCapacidade}
                    </span>
                    {item.pedidos?.clientes?.nome_fantasia && (
                      <span className="inline-flex max-w-[min(100%,14rem)] items-center gap-0.5 truncate rounded-md bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600 sm:max-w-none sm:gap-1 sm:px-2 md:text-sm">
                        <span className="material-icons shrink-0 text-[14px] sm:text-sm">person</span>
                        <span className="truncate">{item.pedidos.clientes.nome_fantasia}</span>
                      </span>
                    )}
                  </div>
                )}

                {!isEntradaEmbalagem && !isSaidaEmbalagem ? (
                <div className="flex shrink-0 sm:pl-2 w-full sm:w-auto justify-stretch sm:justify-end sm:pt-0.5">
                  {isMassa && (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                      {receitasBatidas > 0 && !disableMassaAction ? (
                        <button
                          type="button"
                          onClick={() => onOpenMassaLotes(item, 'list')}
                          title="Ver, editar ou excluir lotes de massa já registrados"
                          className={`${BTN_PRIMARY} w-full sm:w-auto bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99]`}
                        >
                          <span className={BTN_PRIMARY_ICON}>edit</span>
                          <span>Editar lotes</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          if (disableMassaAction) return;
                          if (
                            !pedirConfirmacaoSeMassaMetaAtingida(
                              receitasBatidas,
                              receitasNecessarias,
                            )
                          ) {
                            return;
                          }
                          onOpenMassaLotes(item, receitasBatidas > 0 ? 'newLote' : 'list');
                        }}
                        title={
                          item.produtoJoinFaltando
                            ? 'Corrija o cadastro do produto antes de iniciar a massa'
                            : massaMetaJaAtingida
                              ? 'Meta de receitas atingida — confirme para registrar lote extra'
                              : receitasBatidas > 0
                                ? 'Registrar um novo lote de massa'
                                : 'Iniciar massa desta ordem'
                        }
                        className={`${BTN_PRIMARY} w-full sm:w-auto ${
                          disableMassaAction
                            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                            : massaMetaJaAtingida
                              ? 'border-amber-500 bg-amber-50 text-amber-950 hover:bg-amber-100 hover:border-amber-600 active:scale-[0.99]'
                              : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 hover:border-slate-800 active:scale-[0.99]'
                        }`}
                        disabled={disableMassaAction}
                      >
                        <span className={BTN_PRIMARY_ICON}>
                          {receitasBatidas > 0 ? 'add' : 'play_circle'}
                        </span>
                        <span>{receitasBatidas > 0 ? 'Novo lote' : 'Iniciar massa'}</span>
                      </button>
                    </div>
                  )}
                  {isFermentacao && (
                    <button
                      type="button"
                      onClick={() => {
                        if (item.produtoJoinFaltando || !podeAtuarNestaEtapa || etapaConcluida) return;
                        if (onOpenFermentacaoModal) {
                          onOpenFermentacaoModal(item);
                        } else {
                          router.push(etapaPathForOrdem(item.id, 'fermentacao'));
                        }
                      }}
                      disabled={Boolean(item.produtoJoinFaltando) || !podeAtuarNestaEtapa || etapaConcluida}
                      title={
                        item.produtoJoinFaltando
                          ? 'Corrija o cadastro do produto antes de iniciar a fermentação'
                          : etapaConcluida
                            ? 'Fermentação já concluída (meta atingida). Expanda o card para editar ou excluir os carrinhos.'
                            : !podeAtuarNestaEtapa
                              ? (msgAguardando ?? undefined)
                              : undefined
                      }
                      className={`${BTN_PRIMARY} w-full sm:w-auto ${
                        item.produtoJoinFaltando || !podeAtuarNestaEtapa || etapaConcluida
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99]'
                      }`}
                    >
                      <span className={BTN_PRIMARY_ICON}>play_circle</span>
                      <span>Iniciar fermentação</span>
                    </button>
                  )}
                  {!isMassa &&
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
                ) : null}
              </div>

              {item.produtoCargaFilaErro ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-2 py-1.5 text-amber-950 sm:px-3 sm:py-2">
                  <span className="material-icons shrink-0 text-sm sm:text-base">cloud_off</span>
                  <span className="text-xs leading-snug sm:text-sm">
                    <span className="font-medium">Falha ao carregar o produto na fila.</span> O cadastro pode estar
                    correto (ID{' '}
                    <code className="rounded bg-white/80 px-1 py-0.5 text-xs">{item.produto_id}</code>). Recarregue a
                    página; se persistir, veja o log do servidor.
                  </span>
                </div>
              ) : null}
              {item.produtoJoinFaltando && !item.produtoCargaFilaErro ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-100 px-2 py-1.5 text-rose-900 sm:px-3 sm:py-2">
                  <span className="material-icons shrink-0 text-sm sm:text-base">link_off</span>
                  <span className="text-xs leading-snug sm:text-sm">
                    <span className="font-medium">Produto não encontrado no cadastro.</span> ID informado na ordem:{' '}
                    <code className="rounded bg-white/80 px-1 py-0.5 text-xs">{item.produto_id}</code>. Edite a ordem e
                    associe um produto válido ou restaure o cadastro no Supabase.
                  </span>
                </div>
              ) : null}

              {quantityInfo.hasWarning && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-800 sm:px-3 sm:py-2">
                  <span className="material-icons text-sm sm:text-base">warning</span>
                  <span className="text-xs leading-snug sm:text-sm">
                    {quantityInfo.warningMessage || 'Receita obrigatória não configurada para este produto.'}
                  </span>
                </div>
              )}

              {mostrarConfirmarEtapas &&
                podeSincronizarPreRequisito &&
                !filaEtapaTemBotaoAdiantar(effectiveStation) && (
                  <div className="space-y-2">
                    {faltaPreRequisitos && msgAguardando ? (
                      <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50/95 px-2 py-1.5 text-violet-950 sm:px-3 sm:py-2">
                        <span className="material-icons text-sm shrink-0 sm:text-base">hourglass_empty</span>
                        <span className="text-xs leading-snug sm:text-sm">{msgAguardando}</span>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onOpenPreRequisitoSync(item)}
                      className="w-full rounded-lg border border-violet-400 bg-violet-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 sm:py-2"
                    >
                      {labelConfirmarEtapas}
                    </button>
                  </div>
                )}

              {/* Linha 2: barras de progresso */}
              {isMassa && receitasNecessarias > 0 && (
                <div className="w-full pt-0.5">
                  <ProductionProgressBar receitasOP={receitasNecessarias} receitasMassa={receitasBatidas} />
                </div>
              )}
              {isFermentacao && (
                <div className="w-full space-y-2 border-t border-slate-100 pt-2">
                  <FilaFermentacaoCarrinhosEditor
                    ordemProducaoId={item.id}
                    carrinhos={item.fermentacao_carrinhos ?? []}
                    unidadesAssadeira={item.produtos.unidades_assadeira}
                    onRefresh={() => router.refresh()}
                  />
                  <FermentacaoProgressoBar variant="compact" {...fermentacaoProgressMetricsForQueueItem(item)} />
                </div>
              )}
              {isEntradaEmbalagem && (
                <div className="w-full space-y-2 border-t border-slate-100 pt-2">
                  <FilaEntradaEmbalagemRegistrosEditor
                    ordemProducaoId={item.id}
                    registros={item.entrada_embalagem_registros ?? []}
                    onRefresh={() => router.refresh()}
                  />
                </div>
              )}
              {isSaidaEmbalagem && (
                <div className="w-full space-y-2 border-t border-slate-100 pt-2">
                  <FilaSaidaEmbalagemRegistrosEditor
                    ordemProducaoId={item.id}
                    registros={item.saida_embalagem_registros ?? []}
                    onRefresh={() => router.refresh()}
                  />
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
              {embalagemSaidaProgress && (
                <div className="w-full pt-0.5 border-t border-slate-100">
                  <div className="space-y-2 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/90 px-2.5 py-2 sm:px-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                          Lotes na embalagem
                        </p>
                        <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
                          {embalagemSaidaProgress.lotesEntrada}
                        </p>
                        <p className="text-[10px] text-slate-500 sm:text-xs">Registros na entrada da embalagem</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                          Caixas
                        </p>
                        <p className="text-lg font-bold tabular-nums text-indigo-900 sm:text-xl">
                          {embalagemSaidaProgress.caixasInformadas != null
                            ? embalagemSaidaProgress.caixasInformadas
                            : '—'}
                          {embalagemSaidaProgress.metaCaixas != null && (
                            <span className="text-sm font-semibold text-slate-500">
                              {' '}
                              / {embalagemSaidaProgress.metaCaixas}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-500 sm:text-xs">
                          Informadas · ref. {embalagemSaidaProgress.metaResumo}
                        </p>
                      </div>
                    </div>
                    {embalagemSaidaProgress.metaCaixas != null &&
                      embalagemSaidaProgress.caixasInformadas != null && (
                        <div>
                          <div className="mb-1 flex justify-between text-[10px] font-medium text-slate-600 sm:text-xs">
                            <span>Progresso (caixas)</span>
                            <span className="tabular-nums">
                              {Math.min(
                                100,
                                Math.round(
                                  (embalagemSaidaProgress.caixasInformadas / embalagemSaidaProgress.metaCaixas) *
                                    100,
                                ),
                              )}
                              %
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 sm:h-3">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (embalagemSaidaProgress.caixasInformadas / embalagemSaidaProgress.metaCaixas) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    {embalagemSaidaProgress.metaCaixas == null && embalagemSaidaProgress.metaSubtexto && (
                      <p className="text-[10px] leading-snug text-slate-500 sm:text-xs">
                        {embalagemSaidaProgress.metaSubtexto}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
  };

  return (
    <>
      {isSaidaEmbalagem &&
        queueForCardsActive.length === 0 &&
        queueForCardsProntos.length > 0 && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2.5 text-xs text-indigo-950 sm:text-sm">
            Não há ordens pendentes de saída. As ordens com caixas já informadas estão na secção abaixo — toque
            no card para <span className="font-semibold">editar ou excluir</span> cada lançamento.
          </div>
        )}
      {queueForCardsActive.map((item, i) =>
        renderOrdemCard(item, i, false, primeiraOrdemAcionavelId != null && item.id === primeiraOrdemAcionavelId),
      )}
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
