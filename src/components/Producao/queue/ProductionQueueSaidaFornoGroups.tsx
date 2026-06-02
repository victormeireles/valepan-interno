'use client';

import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';
import FilaSaidaFornoRegistrosEditor from '@/components/Producao/queue/FilaSaidaFornoRegistrosEditor';
import FilaOrdemProducaoProgressBar from '@/components/Producao/queue/FilaOrdemProducaoProgressBar';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import { BTN_ADIANTAR_SECONDARY_INLINE } from '@/components/Producao/queue/fila-adiantar-etapas-ui';
import {
  filaGrupoSaidaFornoEstadoVisual,
  filaEtapaGrupoProgressoRelativoPct,
  labelConfirmarEtapasNaFila,
  ordemAdiantarEtapasComoSecundarioNaFila,
  ordemFaltaPreRequisitosNaEtapaFila,
  ordemMostrarConfirmarEtapasNaFila,
  ordemPreRequisitosAtendidosParaTrabalharNaEtapa,
  saidaFornoGroupProgressMetrics,
  type FilaGrupoProdutoEstadoVisual,
} from '@/components/Producao/queue/production-queue-metrics';

function shellGrupoSaida(estado: FilaGrupoProdutoEstadoVisual, joinFaltando: boolean): string {
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

function seloGrupoSaida(estado: FilaGrupoProdutoEstadoVisual): { label: string; cn: string } | null {
  switch (estado) {
    case 'finalizada':
      return {
        label: 'Etapa ok',
        cn: 'rounded-full border border-emerald-300/90 bg-emerald-100/95 px-2 py-0.5 text-[10px] font-semibold text-emerald-950 sm:text-xs',
      };
    case 'em_andamento':
      return {
        label: 'Em andamento',
        cn: 'rounded-full border border-amber-300/90 bg-amber-100/95 px-2 py-0.5 text-[10px] font-semibold text-amber-950 sm:text-xs',
      };
    case 'proximo':
      return {
        label: 'Próximo',
        cn: 'rounded-full border border-sky-400/90 bg-sky-100/95 px-2 py-0.5 text-[10px] font-semibold text-sky-950 sm:text-xs',
      };
    case 'pendente':
      return {
        label: 'Não iniciado',
        cn: 'rounded-full border border-slate-300/90 bg-slate-100/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 sm:text-xs',
      };
    default:
      return null;
  }
}

interface Props {
  saidaFornoGroups: Array<{ produto_id: string; orders: ProductionQueueItem[] }>;
  expandedSaidaFornoProdutoId: string | null;
  setExpandedSaidaFornoProdutoId: (id: string | null) => void;
  filaSecao?: 'active' | 'prontos';
  etapaFila: 'saida_forno';
  onOpenPreRequisitoSync: (item: ProductionQueueItem) => void;
  onRefresh: () => void;
}

export default function ProductionQueueSaidaFornoGroups({
  saidaFornoGroups,
  expandedSaidaFornoProdutoId,
  setExpandedSaidaFornoProdutoId,
  filaSecao = 'active',
  etapaFila,
  onOpenPreRequisitoSync,
  onRefresh,
}: Props) {
  return (
    <>
      {saidaFornoGroups.map(({ produto_id, orders }, groupIndex) => {
        const exp = expandedSaidaFornoProdutoId === produto_id;
        const g = saidaFornoGroupProgressMetrics(orders);
        const prodNome = orders[0].produtos.nome;
        const joinFaltando = orders.some((o) => o.produtoJoinFaltando);
        const estadoGrupo = filaGrupoSaidaFornoEstadoVisual(orders, {
          fromProntosSection: filaSecao === 'prontos',
          isFirstActiveGroup: filaSecao === 'active' && groupIndex === 0,
        });
        const shell = shellGrupoSaida(estadoGrupo, joinFaltando);
        const selo = seloGrupoSaida(estadoGrupo);

        return (
          <div
            key={produto_id}
            className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${shell}`}
          >
            <button
              type="button"
              onClick={() => setExpandedSaidaFornoProdutoId(exp ? null : produto_id)}
              className="flex w-full min-h-[52px] items-center justify-between gap-2.5 p-3 text-left transition-colors hover:bg-white/40 active:bg-white/55 sm:min-h-0 sm:gap-3 sm:p-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="min-w-0 max-w-[42%] shrink truncate text-sm font-bold leading-tight text-gray-900 sm:text-base">
                    {prodNome}
                  </h3>
                  {!joinFaltando && (
                    <FilaOrdemProducaoProgressBar
                      pct={filaEtapaGrupoProgressoRelativoPct(orders, 'saida_forno')}
                      className="basis-0"
                    />
                  )}
                  {selo && <span className={selo.cn}>{selo.label}</span>}
                </div>
              </div>
              <span className="material-icons shrink-0 text-2xl text-gray-400 sm:text-xl">
                {exp ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {exp && (
              <div className="border-t border-gray-100 bg-slate-50/40 px-3 py-2.5 sm:px-3.5 sm:py-3">
                <VolumeTriploProgressoBar
                  variant="compact"
                  meta={g.meta}
                  etapaAnterior={g.entradaForno}
                  etapaAtual={g.saidaForno}
                  unidadeCurta={g.unidadeCurta}
                  unidadesPorAssadeira={g.unidadesPorAssadeira}
                  statsColumnOrder={['atual', 'anterior', 'meta']}
                  labels={{
                    unitLine: '',
                    meta: 'Ordem de produção de hoje',
                    etapaAnterior: 'Volume na etapa anterior (Entrada no forno)',
                    etapaAtual: 'Saída do forno concluída',
                    compactAnterior: 'Ant. (Entrada)',
                    compactAtual: 'Saída',
                    footer: null,
                  }}
                />
                <ul className="mt-3 space-y-1.5">
                  {orders.map((o) => {
                    const bloqueada =
                      !o.produtoJoinFaltando && ordemFaltaPreRequisitosNaEtapaFila(o, etapaFila);
                    const mostrarAdiantar =
                      !o.produtoJoinFaltando && ordemMostrarConfirmarEtapasNaFila(o, etapaFila);
                    const adiantarSecundario = ordemAdiantarEtapasComoSecundarioNaFila(o, etapaFila);
                    const labelAdiantar = labelConfirmarEtapasNaFila(o, etapaFila);
                    const registros = o.saida_forno_registros ?? [];
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
                            ) : registros.length > 0 ? (
                              <span className="text-[10px] text-slate-500">
                                {registros.length} lançamento{registros.length === 1 ? '' : 's'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {!bloqueada || registros.length > 0 ? (
                          <FilaSaidaFornoRegistrosEditor
                            ordemProducaoId={o.id}
                            registros={registros}
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
