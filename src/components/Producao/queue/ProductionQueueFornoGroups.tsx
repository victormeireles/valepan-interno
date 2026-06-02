'use client';

import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';
import FilaEntradaFornoRegistrosEditor from '@/components/Producao/queue/FilaEntradaFornoRegistrosEditor';
import FilaOrdemProducaoProgressBar from '@/components/Producao/queue/FilaOrdemProducaoProgressBar';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import { BTN_ADIANTAR_SECONDARY_INLINE } from '@/components/Producao/queue/fila-adiantar-etapas-ui';
import {
  filaGrupoEntradaFornoEstadoVisual,
  fornoGroupProgressMetrics,
  filaEtapaGrupoProgressoRelativoPct,
  labelConfirmarEtapasNaFila,
  ordemAdiantarEtapasComoSecundarioNaFila,
  ordemFaltaPreRequisitosNaEtapaFila,
  ordemMostrarConfirmarEtapasNaFila,
  ordemPreRequisitosAtendidosParaTrabalharNaEtapa,
  type FilaGrupoProdutoEstadoVisual,
} from '@/components/Producao/queue/production-queue-metrics';

function shellGrupoForno(estado: FilaGrupoProdutoEstadoVisual, joinFaltando: boolean): string {
  if (joinFaltando) return 'border-rose-200 bg-rose-50/30';
  switch (estado) {
    case 'finalizada':
      return 'border-emerald-200/90 bg-emerald-50/35';
    case 'em_andamento':
      return 'border-amber-200/90 bg-amber-50/40';
    case 'proximo':
      return 'border-sky-400/75 bg-sky-50/45 ring-1 ring-sky-200/50';
    default:
      return 'border-gray-100 bg-white';
  }
}

function seloGrupoForno(estado: FilaGrupoProdutoEstadoVisual): { label: string; cn: string } | null {
  switch (estado) {
    case 'finalizada':
      return {
        label: 'Etapa ok',
        cn: 'rounded-full border border-emerald-300/90 bg-emerald-100/95 px-2 py-0.5 text-xs font-semibold text-emerald-950',
      };
    case 'em_andamento':
      return {
        label: 'Em andamento',
        cn: 'rounded-full border border-amber-300/90 bg-amber-100/95 px-2 py-0.5 text-xs font-semibold text-amber-950',
      };
    case 'proximo':
      return {
        label: 'Próximo',
        cn: 'rounded-full border border-sky-400/90 bg-sky-100/95 px-2 py-0.5 text-xs font-semibold text-sky-950',
      };
    case 'pendente':
      return {
        label: 'Não iniciado',
        cn: 'rounded-full border border-slate-300/90 bg-slate-100/95 px-2 py-0.5 text-xs font-semibold text-slate-700',
      };
    default:
      return null;
  }
}

interface Props {
  fornoGroups: Array<{ produto_id: string; orders: ProductionQueueItem[] }>;
  expandedFornoProdutoId: string | null;
  setExpandedFornoProdutoId: (id: string | null) => void;
  /** Lista ativa vs secção de grupos já completos na etapa. */
  filaSecao?: 'active' | 'prontos';
  etapaFila: 'entrada_forno';
  onOpenPreRequisitoSync: (item: ProductionQueueItem) => void;
  onRefresh: () => void;
}

export default function ProductionQueueFornoGroups({
  fornoGroups,
  expandedFornoProdutoId,
  setExpandedFornoProdutoId,
  filaSecao = 'active',
  etapaFila,
  onOpenPreRequisitoSync,
  onRefresh,
}: Props) {
  return (
    <>
      {fornoGroups.map(({ produto_id, orders }, groupIndex) => {
        const exp = expandedFornoProdutoId === produto_id;
        const g = fornoGroupProgressMetrics(orders);
        const prodNome = orders[0].produtos.nome;
        const joinFaltando = orders.some((o) => o.produtoJoinFaltando);
        const estadoGrupo = filaGrupoEntradaFornoEstadoVisual(orders, {
          fromProntosSection: filaSecao === 'prontos',
          isFirstActiveGroup: filaSecao === 'active' && groupIndex === 0,
        });
        const shell = shellGrupoForno(estadoGrupo, joinFaltando);
        const selo = seloGrupoForno(estadoGrupo);
        const obsProducao =
          orders.length === 1 && orders[0].observacao_producao
            ? orders[0].observacao_producao.trim()
            : '';

        return (
          <div
            key={produto_id}
            className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${shell}`}
          >
            <button
              type="button"
              onClick={() => setExpandedFornoProdutoId(exp ? null : produto_id)}
              className="flex w-full min-h-[52px] items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/40 active:bg-white/55 sm:min-h-[48px] sm:gap-2 sm:py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="min-w-0 max-w-[42%] shrink truncate text-sm font-semibold leading-snug text-gray-900 sm:max-w-[46%] sm:leading-tight">
                    {prodNome}
                  </h3>
                  {!joinFaltando && (
                    <FilaOrdemProducaoProgressBar
                      pct={filaEtapaGrupoProgressoRelativoPct(orders, 'entrada_forno')}
                      className="basis-0"
                    />
                  )}
                  {selo && <span className={selo.cn}>{selo.label}</span>}
                </div>
                <p className="mt-0.5 truncate text-xs leading-tight text-gray-500">
                  {orders.length === 1
                    ? [orders[0].lote_codigo, orders[0].lata_tipo_nome ? `(${orders[0].lata_tipo_nome})` : null]
                        .filter(Boolean)
                        .join(' ') || 'entrada forno'
                    : `${orders.length} OP · entrada forno`}
                </p>
                {obsProducao && !joinFaltando && !exp && (
                  <span
                    className="mt-1 block rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold leading-tight text-amber-900"
                    title={`Observação da produção: ${obsProducao}`}
                  >
                    <span className="font-bold uppercase tracking-wide text-amber-700">
                      Obs. produção
                    </span>{' '}
                    {obsProducao}
                  </span>
                )}
              </div>
              <span className="material-icons shrink-0 text-xl text-gray-400" aria-hidden>
                {exp ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {exp && (
              <div className="border-t border-gray-100 bg-slate-50/40 px-2.5 py-2 sm:px-3 sm:py-2.5">
                <VolumeTriploProgressoBar
                  variant="compact"
                  meta={g.meta}
                  etapaAnterior={g.fermentacao}
                  etapaAtual={g.forno}
                  unidadeCurta={g.unidadeCurta}
                  unidadesPorAssadeira={g.unidadesPorAssadeira}
                  statsColumnOrder={['atual', 'anterior', 'meta']}
                  labels={{
                    unitLine: '',
                    meta: 'Ordem de produção de hoje',
                    etapaAnterior: 'Volume na etapa anterior (Fermentação)',
                    etapaAtual: 'Entrada no forno',
                    compactAnterior: 'Ferm.',
                    compactAtual: 'Entrada',
                    footer: null,
                  }}
                />
                {obsProducao && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Observação da produção
                      {orders[0].lata_tipo_nome ? ` · ${orders[0].lata_tipo_nome}` : ''}
                    </div>
                    <p className="mt-0.5 whitespace-pre-line text-xs font-semibold text-amber-900">
                      {obsProducao}
                    </p>
                  </div>
                )}
                <ul className="mt-3 space-y-1.5">
                  {orders.map((o) => {
                    const bloqueada =
                      !o.produtoJoinFaltando && ordemFaltaPreRequisitosNaEtapaFila(o, etapaFila);
                    const mostrarAdiantar =
                      !o.produtoJoinFaltando && ordemMostrarConfirmarEtapasNaFila(o, etapaFila);
                    const adiantarSecundario = ordemAdiantarEtapasComoSecundarioNaFila(o, etapaFila);
                    const labelAdiantar = labelConfirmarEtapasNaFila(o, etapaFila);
                    const entradas = o.entrada_forno_entradas ?? [];
                    const ua = o.produtos.unidades_assadeira ?? null;
                    return (
                      <li
                        key={o.id}
                        className="space-y-2 rounded-lg border border-slate-200/90 bg-white/90 px-2 py-2 sm:px-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-800">{o.lote_codigo}</span>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {mostrarAdiantar && bloqueada ? (
                              <button
                                type="button"
                                onClick={() => onOpenPreRequisitoSync(o)}
                                className="rounded-md border border-violet-400 bg-violet-700 px-2 py-1 text-xs font-semibold text-white hover:bg-violet-800"
                              >
                                {labelAdiantar}
                              </button>
                            ) : adiantarSecundario ? (
                              <button
                                type="button"
                                onClick={() => onOpenPreRequisitoSync(o)}
                                className={BTN_ADIANTAR_SECONDARY_INLINE}
                              >
                                {labelAdiantar}
                              </button>
                            ) : entradas.length > 0 ? (
                              <span className="text-[10px] text-slate-500">
                                {entradas.length} entrada{entradas.length === 1 ? '' : 's'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {!bloqueada || entradas.length > 0 ? (
                          <FilaEntradaFornoRegistrosEditor
                            ordemProducaoId={o.id}
                            entradas={entradas}
                            unidadesAssadeira={ua}
                            onRefresh={onRefresh}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
